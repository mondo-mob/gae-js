import { gaeRequestLogger } from "./gae-request-logger";
import { requestAsyncStorage } from "../../middleware/request-async-storage";

export const gaeJsApp = [gaeRequestLogger, requestAsyncStorage];
