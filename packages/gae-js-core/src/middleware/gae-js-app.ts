import { gaeRequestLogger } from "./gae-request-logger";
import { requestAsyncStorage } from "./request-async-storage";

export const gaeJsApp = [gaeRequestLogger, requestAsyncStorage];
