import { Handler } from "express";
import { userRequestStorage } from "./user-request-storage";
import { ForbiddenError, UnauthorisedError } from "../error";

/**
 * Middleware that checks the current authenticated user has a given role.
 */
export const requiresRole = (role: string): Handler => (req, res, next) => {
  const user = userRequestStorage.get();
  if (!user) {
    return next(new UnauthorisedError("No authenticated user"));
  }

  if (user.roles.includes(role)) {
    return next();
  }

  next(new ForbiddenError(`User does not have the required role ${role}`));
};
