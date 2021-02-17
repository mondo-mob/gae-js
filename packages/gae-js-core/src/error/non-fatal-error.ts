/**
 * A low severity error that is not unusual and can be rectified by the user.
 * i.e. this should not be logged as an error, which may trigger system alerts, etc.
 */
export class NonFatalError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
