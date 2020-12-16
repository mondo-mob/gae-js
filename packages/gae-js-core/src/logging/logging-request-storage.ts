import { Logger } from "./logger/logger";
import { RequestStorageStore } from "../request-storage";

const storageKey = "_LOGGER";
export const loggingRequestStorage = new RequestStorageStore<Logger>(storageKey);
