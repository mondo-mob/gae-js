export class UnauthorisedError extends Error {
  constructor(message?: string) {
    super(message || "Unauthorised");
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
