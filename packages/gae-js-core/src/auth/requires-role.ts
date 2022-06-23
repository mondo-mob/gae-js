import { Handler } from "express";
import { userRequestStorageProvider } from "./user-request-storage-provider";
import { ForbiddenError, UnauthorisedError } from "../error";

/**
 * Middleware that checks the current authenticated user has a given role.
 */
export const requiresRole =
  (role: string): Handler =>
  (req, res, next) => {
    const userStorage = userRequestStorageProvider.get();
    const user = userStorage.get();
    if (!user) {
      return next(new UnauthorisedError("No authenticated user"));
    }

    if ((user.roles || []).includes(role)) {
      return next();
    }

    next(new ForbiddenError(`User does not have the required role ${role}`));
  };
