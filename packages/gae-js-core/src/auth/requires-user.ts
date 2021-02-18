import { Handler } from "express";
import { userRequestStorage } from "./user-request-storage";
import { UnauthorisedError } from "../error";

/**
 * Middleware that checks for an authenticated user in the incoming request.
 */
export const requiresUser = (): Handler => (req, res, next) => {
  const user = userRequestStorage.get();
  if (!user) {
    return next(new UnauthorisedError("No authenticated user"));
  }
  next();
};
