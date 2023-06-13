import * as BunyanLogger from "bunyan";
import { LoggingBunyan } from "@google-cloud/logging-bunyan";
import { runningOnGcp } from "../util/environment";
import { simpleConsoleWriter } from "../../logging/logger/simple-console-writer";

/**
 * Creates a Bunyan logger that falls back to console when not running on GCP
 */
export const googleCloudLogger = (): BunyanLogger =>
  BunyanLogger.createLogger({
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
