import { Handler } from "express";
import * as lb from "@google-cloud/logging-bunyan";
import { defaultLogger } from "../logging/logging";
import { runningOnGcp } from "../util/environment";

const localLoggingMiddleware = (): Handler => {
  const localLogger = defaultLogger;
  return (req, res, next) => {
    localLogger.info(`${req.method} ${req.url}`);
    (req as any).log = localLogger;
    next();
  };
};

const createMiddleware = (): Promise<Handler> => {
  if (runningOnGcp()) {
    return lb.express.middleware({ level: "info" }).then((result) => result.mw);
  } else {
    return Promise.resolve(localLoggingMiddleware());
  }
};

const mwPromise = createMiddleware();

export const gaeRequestLogger: Handler = async (req, res, next) => {
  const middleware = await mwPromise;
  middleware(req, res, next);
};
