import { gaeRequestLogger } from "./gaeRequestLogger";
import { requestAsyncStorage } from "./requestAsyncStorage";

export const gaeJsApp = [gaeRequestLogger, requestAsyncStorage];
