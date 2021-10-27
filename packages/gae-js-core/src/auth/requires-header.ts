import { Handler } from "express";
import { ForbiddenError } from "../error";

/**
 * Middleware that checks for a header in the incoming request.
 */
export const requiresHeader =
  (header: string): Handler =>
  (req, res, next) => {
    if (req.header(header)) return next();
    next(new ForbiddenError(`Request missing required header ${header}`));
  };
