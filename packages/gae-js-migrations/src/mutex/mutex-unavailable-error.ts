/**
 * Error thrown when a request to obtain a Mutex is unsuccessful - most likely due to the
 * mutex already being held by another process.
 */
export class MutexUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
