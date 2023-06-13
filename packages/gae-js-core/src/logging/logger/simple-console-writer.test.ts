import { createLogger } from "../logging";
import { Logger } from "./logger";
import { defaultLoggerProvider } from "../default-logger-provider";
import * as BunyanLogger from "bunyan";
import { simpleConsoleWriter } from "./simple-console-writer";

describe("simpleConsoleWriter", () => {
  let logger: Logger;

  beforeEach(() => {
    defaultLoggerProvider.set(
      BunyanLogger.createLogger({
        name: "test",
        streams: [{ type: "raw", stream: simpleConsoleWriter }],
      })
    );
    logger = createLogger("testing");
  });

  const timeFormat = "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}";

  it("logs info messages", async () => {
    const logSpy = jest.spyOn(console, "log");
    const expectInfoLog = (msgRegex: string) => {
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${timeFormat} \\| \\sINFO \\| ${msgRegex}$`))
      );
    };

    logger.info("basic message");
    logger.info("%s message", "formatted");
    logger.info(new Error("error"), "with error");

    expectInfoLog("testing: basic message");
    expectInfoLog("testing: formatted message");
    expectInfoLog("testing: with error | \\{.*\\}");
  });

  it("logs warn messages", async () => {
    const logSpy = jest.spyOn(console, "log");
    const expectWarnLog = (msgRegex: string) => {
      expect(logSpy).toHaveBeenCalledWith(
        "%s%s%s",
        "\x1b[33m",
        expect.stringMatching(new RegExp(`^${timeFormat} \\| \\sWARN \\| ${msgRegex}$`)),
        "\x1b[0m"
      );
    };

    logger.warn("basic message");
    logger.warn("%s message", "formatted");
    logger.warn(new Error("error"), "with error");

    expectWarnLog("testing: basic message");
    expectWarnLog("testing: formatted message");
    expectWarnLog("testing: with error | \\{.*\\}");
  });

  it("logs error messages with stack", async () => {
    const logSpy = jest.spyOn(console, "log");
    const expectErrorLog = (msgRegex: string) => {
      expect(logSpy).toHaveBeenCalledWith(
        "%s%s%s",
        "\x1b[31m",
        expect.stringMatching(new RegExp(`^${timeFormat} \\| ERROR \\| ${msgRegex}$`)),
        "\x1b[0m"
      );
    };

    logger.error("basic message");
    logger.error("%s message", "formatted");
    logger.error(new Error("error"), "with error");

    expectErrorLog("testing: basic message");
    expectErrorLog("testing: formatted message");
    expectErrorLog("testing: with error | \\s+Error: error\\s+at Object\\.<anonymous>\\.+");
  });
});
