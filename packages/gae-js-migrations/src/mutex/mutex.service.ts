import { newTimestampedEntity, runInTransaction } from "@mondomob/gae-js-firestore";
import { MutexUnavailableError } from "./mutex-unavailable-error";
import { Mutex, mutexesRepository } from "./mutexes.repository";
import { createLogger, LazyProvider } from "@mondomob/gae-js-core";

export class MutexService {
  private readonly logger = createLogger("mutexService");

  /**
   * Obtains a lock for the provided mutex id for the requested number of seconds.
   * @param mutexId id of the lock to obtain
   * @param expirySeconds how long to expire the mutex if not manually released
   */
  async obtain(mutexId: string, expirySeconds: number): Promise<Mutex> {
    this.logger.info(`Obtaining mutex for ${mutexId}...`);

    const result = await runInTransaction(async () => {
      const mutex = await mutexesRepository.get(mutexId);
      if (this.isCurrent(mutex)) {
        throw new MutexUnavailableError(`Mutex ${mutexId} already active for another process`);
      }
      const now = new Date();
      return mutexesRepository.save({
        ...newTimestampedEntity(mutexId),
        ...mutex,
        obtainedAt: now.toISOString(),
        expiredAt: new Date(now.getTime() + expirySeconds * 1000).toISOString(),
        locked: true,
      });
    });
    this.logger.info(`Mutex obtained for ${mutexId}`);
    return result;
  }

  /**
   * Releases a mutex with the provided id
   * @param mutexId the id of the mutex to release
   */
  async release(mutexId: string): Promise<Mutex | null> {
    this.logger.info(`Releasing mutex for ${mutexId}...`);

    const result = await runInTransaction(async () => {
      const mutex = await mutexesRepository.get(mutexId);
      if (!mutex) {
        this.logger.warn(`Attempt to release non-existent mutex ${mutexId}`);
        return null;
      }
      return mutexesRepository.save({
        ...mutex,
        locked: false,
        releasedAt: new Date().toISOString(),
      });
    });
    this.logger.info(`Mutex released for ${mutexId}`);
    return result;
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

export const mutexServiceProvider = new LazyProvider(() => new MutexService());
