import { Logger } from "./logger/logger";
import { RequestStorageLogger } from "./logger/request-storage-logger";

export const createLogger = (name: string): Logger => new RequestStorageLogger(name);
