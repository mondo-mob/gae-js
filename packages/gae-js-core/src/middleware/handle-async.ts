import { Handler, NextFunction, Request, Response } from "express";

export type AsyncHandler = (req: Request, res: Response, next?: NextFunction) => Promise<unknown>;

/**
 * Convenience middleware for handling async middleware functions.
 * Any errors caught will be passed onto the configured error handling middleware
 * @param handlerFn async handler
 */
export const handleAsync =
  (handlerFn: AsyncHandler): Handler =>
  (req, res, next) =>
    handlerFn(req, res, next)
      .then(() => next())
      .catch((error: unknown) => next(error));
