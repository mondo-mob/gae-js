import { Handler, NextFunction, Request, Response } from "express";

export type AsyncHandler = (req: Request, res: Response, next?: NextFunction) => Promise<unknown>;

/**
 * Convenience middleware for handling async middleware functions.
 * This WILL call next() for a successful promise (use asyncHandler() if you don't want that)
 * Any errors caught will be passed onto the configured error handling middleware
 * @param handlerFn async middleware
 */
export const asyncMiddleware =
  (handlerFn: AsyncHandler): Handler =>
  (req, res, next) =>
    handlerFn(req, res, next)
      .then(() => next())
      .catch((error: unknown) => next(error));

/**
 * Convenience middleware for handling async handler functions.
 * This will NOT call next() for a successful promise (use asyncMiddleware() if you need that functionality)
 * Any errors caught will be passed onto the configured error handling middleware
 * @param handlerFn async handler
 */
export const asyncHandler =
  (handlerFn: AsyncHandler): Handler =>
  (req, res, next) =>
    handlerFn(req, res, next).catch((error: unknown) => next(error));
