import { Handler } from "express";
import { createLogger } from "../logging";

/**
 * Node's default request timeout is 120s. For potentially long running requests such as Tasks and Crons, this can
 * cause unexpected behaviour. A task could return a HTTP 502 after 120s even if the task is still running.
 * This could potentially cause a retry of a task before the first execution has finished.
 *
 * There may also be times where you'd like a shorter request timeout than the default.
 *
 * This middleware will set the timeout for requests to the configured value.
 * e.g. For Task and Cron requests this should be set to 600000 (10 minutes)
 *
 * @example Apply to all /tasks endpoints
 * app.use("/tasks", requestTimeoutSeconds(10 * 60 * 1000))
 */
export const requestTimeoutSeconds = (timeoutSeconds: number): Handler => {
  const logger = createLogger("requestTimeout");

  return (req, res, next) => {
    const requestPath = req.originalUrl;
    logger.info(`Setting timeouts to ${timeoutSeconds}s for request: ${requestPath}`);
    req.setTimeout(timeoutSeconds * 1000, () => {
      logger.warn(`Request: ${requestPath} has exceeded configured request timeout of ${timeoutSeconds}s`);
      next(new Error("Request Timeout"));
    });
    res.setTimeout(timeoutSeconds * 1000, () => {
      logger.warn(`Request: ${requestPath} has exceeded configured response timeout of ${timeoutSeconds}s`);
      next(new Error("Service Unavailable"));
    });
    next();
  };
};

/**
 * Convenience form of requestTimeoutSeconds to take timeout in minutes
 *
 * @example Apply timeout of 10 minutes
 * app.use("/tasks", requestTimeoutMinutes(10))
 */
export const requestTimeoutMinutes = (timeoutMinutes: number): Handler => requestTimeoutSeconds(timeoutMinutes * 60);
