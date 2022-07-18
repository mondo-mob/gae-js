import { Handler } from "express";
import { NotFoundError } from "../error";

/**
 * Middleware to throw NotFoundError if headers not already sent.
 * Useful as a final catch-all in a sub-router to stop route matching and prevent flow falling back to parent.
 * @param message error message to pass in error
 *
 * @example Return 404 instead of fallback for any request to /api/* that doesn't match defined api routes
 * const apiRouter = Router();
 * apiRouter.get("/messages", () => { // Send back messages });
 * apiRouter.use(routeNotFound("Invalid API request"));
 *
 * app.use("/api", apiRouter);
 * app.use("/*",  () => { // Standard fallback route });
 */
export const routeNotFound =
  (message?: string): Handler =>
  (req, res, next) => {
    if (!res.headersSent) {
      next(new NotFoundError(message));
    }
    next();
  };
