import { createLogger, OneOrMany } from "@mondomob/gae-js-core";
import { newTimestampedEntity, runInTransaction } from "../firestore";
import { MutexUnavailableError } from "./mutex-unavailable-error";
import { Mutex, mutexesRepository } from "./mutexes.repository";
import { castArray } from "lodash";

export class MutexService {
  private readonly logger = createLogger("mutexService");
  private readonly prefix: string;
  private readonly defaultExpirySeconds: number;

  constructor({ expirySeconds, prefix = [] }: MutexConfigOptions) {
    this.defaultExpirySeconds = expirySeconds;
    const prefixString = joinIdElements(prefix);
    this.prefix = prefixString && `${prefixString}${SEPARATOR}`;
  }

  /**
   * Runs the supplied function if the mutex can be obtained. Always releases the mutex after execution.
   * This variant does not throw an error if the mutex is already locked, instead logging or executing the
   * defined onMutexUnavailable handler if supplied in options.
   *
   * @param mutexId id of the lock to obtain ... one or many strings. If array supplied, they are joined using '::'.
   * @param fn function to execute if mutex can be obtained.
   * @param options mutex options (including optional onMutexUnavailable function)
   */
  async withMutexSilent(
    mutexId: OneOrMany<string>,
    fn: () => Promise<unknown> | unknown,
    options?: MutexOptionsWithHandler
  ): Promise<void> {
    const mutexIdString = joinIdElements(mutexId);
    try {
      await this.withMutex(mutexIdString, fn, options);
    } catch (err) {
      if (err instanceof MutexUnavailableError) {
        if (options?.onMutexUnavailable) {
          options.onMutexUnavailable();
        } else {
          this.logger.info(`Mutex ${this.mutexId(mutexIdString)} already taken. Execution skipped`);
        }
      } else {
        throw err;
      }
    }
  }

  /**
   * Runs the supplied function if the mutex can be obtained. Always releases the mutex after execution.
   *
   * @param mutexId id of the lock to obtain ... one or many strings. If array supplied, they are joined using '::'.
   * @param fn function to execute if mutex can be obtained.
   * @param options mutex options
   * @throws MutexUnavailableError when mutex is already locked.
   */
  async withMutex<T>(mutexId: OneOrMany<string>, fn: () => Promise<T> | T, options?: MutexOptions): Promise<T> {
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
  async obtain(
    mutexId: OneOrMany<string>,
    { expirySeconds = this.defaultExpirySeconds }: MutexOptions = {}
  ): Promise<Mutex> {
    const id = this.mutexId(joinIdElements(mutexId));
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
        obtainedAt: now,
        expiredAt: new Date(now.getTime() + expirySeconds * 1000),
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
  async release(mutexId: OneOrMany<string>): Promise<Mutex | null> {
    const id = this.mutexId(joinIdElements(mutexId, false));
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
        releasedAt: new Date(),
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

    if (new Date() > mutex.expiredAt) {
      this.logger.warn(`Mutex ${mutex.id} is locked, but expired at ${mutex.expiredAt}.`);
      return false;
    }

    return true;
  };
}

const joinIdElements = (elements: OneOrMany<string>, validate = true): string => {
  const joined = castArray(elements).join(SEPARATOR);
  if (validate && joined.includes("/")) {
    throw new Error(`Mutex id elements cannot contain '/'. Supplied: ${elements}.`);
  }
  return joined;
};

// Note that you can't have a separator as "/" inside an id of firestore element with our lib
const SEPARATOR = "::";

interface MutexConfigOptions {
  expirySeconds: number;
  prefix?: OneOrMany<string>;
}

interface MutexOptions {
  expirySeconds?: number;
}

interface MutexOptionsWithHandler extends MutexOptions {
  onMutexUnavailable?: HandlerFunction;
}

type HandlerFunction = () => unknown | Promise<unknown>;
