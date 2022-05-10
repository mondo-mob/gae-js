/* eslint-disable @typescript-eslint/ban-types,@typescript-eslint/explicit-module-boundary-types */
import { Logger } from "./logger";

const isString = (param: any) => typeof param === "string";

export class ProxyLogger implements Logger {
  private readonly prefix: string;

  constructor(private loggerProvider: () => Logger, name?: string) {
    this.prefix = name ? `${name}: ` : "";
  }

  debug(): boolean;
  debug(error: Error, ...params: any[]): void;
  debug(obj: Object, ...params: any[]): void;
  debug(format: any, ...params: any[]): void;
  debug(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    this.logWithLevel("debug", formatOrObjOrErr, ...params);
  }

  error(): boolean;
  error(error: Error, ...params: any[]): void;
  error(obj: Object, ...params: any[]): void;
  error(format: any, ...params: any[]): void;
  error(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    this.logWithLevel("error", formatOrObjOrErr, ...params);
  }

  fatal(): boolean;
  fatal(error: Error, ...params: any[]): void;
  fatal(obj: Object, ...params: any[]): void;
  fatal(format: any, ...params: any[]): void;
  fatal(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    this.logWithLevel("fatal", formatOrObjOrErr, ...params);
  }

  info(): boolean;
  info(error: Error, ...params: any[]): void;
  info(obj: Object, ...params: any[]): void;
  info(format: any, ...params: any[]): void;
  info(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    this.logWithLevel("info", formatOrObjOrErr, ...params);
  }

  trace(): boolean;
  trace(error: Error, ...params: any[]): void;
  trace(obj: Object, ...params: any[]): void;
  trace(format: any, ...params: any[]): void;
  trace(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    this.logWithLevel("trace", formatOrObjOrErr, ...params);
  }

  warn(): boolean;
  warn(error: Error, ...params: any[]): void;
  warn(obj: Object, ...params: any[]): void;
  warn(format: any, ...params: any[]): void;
  warn(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    this.logWithLevel("warn", formatOrObjOrErr, ...params);
  }

  private logWithLevel<L extends keyof Logger>(level: L, formatOrObjOrErr?: any, ...params: any[]) {
    let firstParam = formatOrObjOrErr;
    const otherParams = [...params];

    // Support prefixing if
    // a) first argument is string or
    // b) first arg is not string but second is.
    if (isString(firstParam)) {
      firstParam = this.addPrefix(formatOrObjOrErr);
    } else if (otherParams.length && isString(otherParams[0])) {
      otherParams[0] = this.addPrefix(otherParams[0]);
    }

    return otherParams.length
      ? this.loggerProvider()[level](firstParam, ...otherParams)
      : this.loggerProvider()[level](firstParam);
  }

  private addPrefix(param: string) {
    return `${this.prefix}${param}`;
  }
}
