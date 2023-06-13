import { Logger } from "./logger";
import { ProxyLogger } from "./proxy-logger";
import { loggingRequestStorage } from "../logging-request-storage";
import { defaultLoggerProvider } from "../default-logger-provider";

const requestStorageLoggerOrDefault = (): Logger => {
  return loggingRequestStorage.getWithDefault(defaultLoggerProvider.get());
};

export class RequestStorageLogger extends ProxyLogger {
  constructor(name?: string) {
    super(requestStorageLoggerOrDefault, name);
  }
}
