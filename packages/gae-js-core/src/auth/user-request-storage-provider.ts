import { RequestStorageStore } from "../request-storage";
import { AuthUser } from "./auth-user";
import { Provider } from "../util";

export class UserRequestStorageProvider<U extends AuthUser, T extends RequestStorageStore<U>> extends Provider<T> {}

export const userRequestStorageProvider = new UserRequestStorageProvider(
  undefined,
  "No User request storage instance found. Please initialise userRequestStorageProvider."
);
