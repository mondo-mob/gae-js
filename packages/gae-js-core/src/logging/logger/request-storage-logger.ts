import { Logger } from "./logger";
import { ProxyLogger } from "./proxy-logger";
import { loggingRequestStorage } from "../logging-request-storage";
import { defaultLogger } from "../logging";

const requestStorageLoggerOrDefault = (): Logger => {
  return loggingRequestStorage.getWithDefault(defaultLogger);
};

export class RequestStorageLogger extends ProxyLogger {
  constructor(name?: string) {
    super(requestStorageLoggerOrDefault, name);
  }
}
