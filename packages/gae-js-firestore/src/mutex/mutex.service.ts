import { createLogger } from "@mondomob/gae-js-core";
import { newTimestampedEntity, runInTransaction } from "../firestore";
import { MutexUnavailableError } from "./mutex-unavailable-error";
import { Mutex, mutexesRepository } from "./mutexes.repository";

export class MutexService {
  private readonly logger = createLogger("mutexService");
  private readonly prefix: string;
  private readonly defaultExpirySeconds: number;

  constructor({ expirySeconds, prefixes = [], prefixSeparator = "::" }: MutexConfigOptions) {
    this.defaultExpirySeconds = expirySeconds;
    this.prefix = prefixes.length > 0 ? `${prefixes.join(prefixSeparator)}${prefixSeparator}` : "";
  }

  /**
   * Runs the supplied function if the mutex can be obtained. Always releases the mutex after execution.
   * This variant does not throw an error if the mutex is already locked, instead logging or executing the
   * defined onMutexUnavailable handler if supplied in options.
   *
   * @param mutexId id of the lock to obtain
   * @param fn function to execute if mutex can be obtained.
   * @param options mutex options (including optional onMutexUnavailable function)
   */
  async withMutexSilent(
    mutexId: string,
    fn: () => Promise<unknown> | unknown,
    options?: MutexOptionsWithHandler
  ): Promise<void> {
    try {
      await this.withMutex(mutexId, fn, options);
    } catch (err) {
      if (err instanceof MutexUnavailableError) {
        if (options?.onMutexUnavailable) {
          options.onMutexUnavailable();
        } else {
          this.logger.info(`Mutex ${this.mutexId(mutexId)} already taken. Execution skipped`);
        }
      } else {
        throw err;
      }
    }
  }

  /**
   * Runs the supplied function if the mutex can be obtained. Always releases the mutex after execution.
   *
   * @param mutexId id of the lock to obtain
   * @param fn function to execute if mutex can be obtained.
   * @param options mutex options
   * @throws MutexUnavailableError when mutex is already locked.
   */
  async withMutex<T>(mutexId: string, fn: () => Promise<T> | T, options?: MutexOptions): Promise<T> {
    await this.obtain(mutexId, options);
    try {
      return await fn();
    } finally {
      await this.release(mutexId);
    }
  }

  /**
   * Obtains a lock for the provided mutex id for the requested number of seconds.
   * @param mutexId id of the lock to obtain
   * @param options mutex options
   */
  async obtain(mutexId: string, { expirySeconds = this.defaultExpirySeconds }: MutexOptions = {}): Promise<Mutex> {
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

interface MutexConfigOptions {
  expirySeconds: number;
  prefixes?: string[];
  prefixSeparator?: string;
}

interface MutexOptions {
  expirySeconds?: number;
}

interface MutexOptionsWithHandler extends MutexOptions {
  onMutexUnavailable?: HandlerFunction;
}

type HandlerFunction = () => unknown | Promise<unknown>;
