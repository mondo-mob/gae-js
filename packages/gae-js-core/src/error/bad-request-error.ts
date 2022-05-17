import { HttpError } from "./http-error";

export class BadRequestError extends HttpError {
  constructor(message?: string, readonly code = "bad.request") {
    super(400, message || "Bad Request", code);
  }
}
