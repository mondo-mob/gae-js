export class AccessDeniedError extends Error {
  constructor(message?: string) {
    super(message || "Forbidden");
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
