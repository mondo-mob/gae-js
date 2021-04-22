import { HttpError } from "./http-error";

export class UnauthorisedError extends HttpError {
  constructor(message?: string) {
    super(401, message || "Unauthorised");
  }
}
