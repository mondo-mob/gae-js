import { Handler } from "express";
import * as lb from "@google-cloud/logging-bunyan";
import { runningOnGcp } from "../util/environment";
import { defaultLoggerProvider } from "../../logging/default-logger-provider";

const localLoggingMiddleware = (): Handler => {
  const localLogger = defaultLoggerProvider.get();
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
