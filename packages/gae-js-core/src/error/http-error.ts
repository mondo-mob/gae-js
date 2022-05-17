export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly code: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
