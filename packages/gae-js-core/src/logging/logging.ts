import { Logger } from "./logger/logger";
import { RequestStorageLogger } from "./logger/request-storage-logger";
import * as BunyanLogger from "bunyan";
import { LoggingBunyan } from "@google-cloud/logging-bunyan";
import { runningOnGcp } from "../util/environment";
import { simpleConsoleWriter } from "./logger/simple-console-writer";

/**
 * The internal default bunyan logger that will be used whenever the
 * request storage logger is not available.
 */
export const defaultLogger: BunyanLogger = BunyanLogger.createLogger({
  name: "service",
  level: "info",
  streams: runningOnGcp()
    ? [new LoggingBunyan().stream("info")]
    : [
        {
          type: "raw",
          stream: simpleConsoleWriter,
        },
      ],
});

export const createLogger = (name: string): Logger => new RequestStorageLogger(name);
