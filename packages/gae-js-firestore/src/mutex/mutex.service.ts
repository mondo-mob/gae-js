import { createLogger } from "@mondomob/gae-js-core";
import { newTimestampedEntity, runInTransaction } from "../firestore";
import { MutexUnavailableError } from "./mutex-unavailable-error";
import { Mutex, mutexesRepository } from "./mutexes.repository";

interface MutexOptions {
  defaultExpirySeconds: number;
  prefixes?: string[];
  prefixSeparator?: string;
}

export class MutexService {
  private readonly logger = createLogger("mutexService");
  private readonly prefix: string;
  private readonly defaultExpirySeconds: number;

  constructor({ defaultExpirySeconds, prefixes = [], prefixSeparator = "::" }: MutexOptions) {
    this.defaultExpirySeconds = defaultExpirySeconds;
    this.prefix = prefixes.length > 0 ? `${prefixes.join(prefixSeparator)}${prefixSeparator}` : "";
  }

  /**
   * Obtains a lock for the provided mutex id for the requested number of seconds.
   * @param mutexId id of the lock to obtain
   * @param expirySeconds how long to expire the mutex if not manually released
   */
  async obtain(mutexId: string, expirySeconds: number = this.defaultExpirySeconds): Promise<Mutex> {
    const id = this.mutexId(mutexId);
    this.logger.info(`Obtaining mutex for ${id}...`);

    const result = await runInTransaction(async () => {
      const mutex = await mutexesRepository.get(id);
      if (this.isCurrent(mutex)) {
        throw new MutexUnavailableError(`Mutex ${id} already active for another process`);
      }
      const now = new Date();
      return mutexesRepository.save({
        ...newTimestampedEntity(id),
        ...mutex,
        obtainedAt: now.toISOString(),
        expiredAt: new Date(now.getTime() + expirySeconds * 1000).toISOString(),
        locked: true,
      });
    });
    this.logger.info(`Mutex obtained for ${id}`);
    return result;
  }

  /**
   * Releases a mutex with the provided id
   * @param mutexId the id of the mutex to release
   */
  async release(mutexId: string): Promise<Mutex | null> {
    const id = this.mutexId(mutexId);
    this.logger.info(`Releasing mutex for ${id}...`);

    const result = await runInTransaction(async () => {
      const mutex = await mutexesRepository.get(id);
      if (!mutex) {
        this.logger.warn(`Attempt to release non-existent mutex ${id}`);
        return null;
      }
      return mutexesRepository.save({
        ...mutex,
        locked: false,
        releasedAt: new Date().toISOString(),
      });
    });
    this.logger.info(`Mutex released for ${id}`);
    return result;
  }

  private mutexId(id: string) {
    return `${this.prefix}${id}`;
  }

  private isCurrent = (mutex: Mutex | null) => {
    if (!mutex || !mutex.locked || !mutex.expiredAt) {
      return false;
    }

    if (new Date() > new Date(mutex.expiredAt)) {
      this.logger.warn(`Mutex ${mutex.id} is locked, but expired at ${mutex.expiredAt}.`);
      return false;
    }

    return true;
  };
}
