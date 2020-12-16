/* eslint-disable @typescript-eslint/no-empty-interface */
import * as BunyanLogger from "bunyan";

/**
 * Logging portion of Bunyan's Logger interface extracted to expose core logging functionality only.
 */
export interface Logger extends Pick<BunyanLogger, "trace" | "debug" | "info" | "warn" | "error" | "fatal"> {}
