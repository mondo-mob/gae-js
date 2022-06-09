import { WriteFn } from "bunyan";

const levelLabels: { [key: number]: string | undefined } = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

const colours = {
  green: "\x1b[32m",
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

interface LogRecord {
  name: string;
  level: number;
  msg: string;
  time: Date;
  err?: unknown;
}

const pad = (num: number): string => num.toString().padStart(2, "0");

const formatTime = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds()
  )}`;

/**
 * Simple console writer to allow for easier local development vs bunyan json output.
 */
export const simpleConsoleWriter: WriteFn = {
  write: (object) => {
    const logRecord = object as LogRecord;

    // Display local time but consistent format
    const time = formatTime(logRecord.time);

    // Use text label and pad to be consistent width
    const level = `${levelLabels[logRecord.level] || "NONE"}`.padStart(5, " ");

    // Bunyan will serialize Errors to err prop.
    // Other custom objects will not be output to console
    let message = `${time} | ${level} | ${logRecord.msg}`;
    if (logRecord.err) {
      message = `${message} \n ${errorString(logRecord.err)}`;
    }

    // Add colour for levels above INFO
    if (logRecord.level > 30) {
      const levelColour = logRecord.level < 50 ? colours.yellow : colours.red;
      console.log("%s%s%s", levelColour, message, colours.reset);
    } else {
      console.log(message);
    }
  },
};

const errorString = (err: unknown) =>
  isErrorLike(err) ? err.stack ?? `${err.name}: ${err.message}` : JSON.stringify(err, undefined, 2);

const isErrorLike = (err: unknown): err is Error =>
  typeof err === "object" && err != null && "message" in err && "name" in err;
