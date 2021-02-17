import { RequestStorageStore } from "../request-storage";
import { BaseUser } from "./user";

const storageKey = "_USER";
export const userRequestStorage = new RequestStorageStore<BaseUser>(storageKey);
