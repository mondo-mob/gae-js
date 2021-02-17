import { Handler } from "express";
import { userRequestStorage } from "./user-request-storage";
import { AccessDeniedError, UnauthorisedError } from "../error";

export const requiresRole = (role: string): Handler => (req, res, next) => {
  const user = userRequestStorage.get();
  if (!user) {
    return next(new UnauthorisedError("No authenticated user"));
  }

  if (user.roles.includes(role)) {
    return next();
  }

  next(new AccessDeniedError("User does not have the required role"));
};
