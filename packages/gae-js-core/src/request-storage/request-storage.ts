import { AsyncLocalStorage } from "async_hooks";

type RequestStore = Record<string, any>;

const requestLocalStorage = new AsyncLocalStorage<RequestStore>();

/**
 * Runs the given function within a new AsyncLocalStorage context.
 * - If no request storage context exists the store will default to an empty object
 * - For nested contexts the store will default to a shallow copy of the parent context
 *
 * @param fn the callback function to execute within the new async context
 */
export const runWithRequestStorage = <R>(fn: (...args: any[]) => R): R => {
  return requestLocalStorage.run({ ...requestLocalStorage.getStore() }, fn);
};

/**
 * Returns the entire current request storage store or null if none found.
 * Prefer setting/fetching values using the convenience methods
 * e.g. getRequestStorageValue, setRequestStorageValue
 */
export const getRequestStore = (): RequestStore | null => {
  return requestLocalStorage.getStore() ?? null;
};

const getRequestStoreRequired = (): RequestStore => {
  const context = getRequestStore();
  if (!context) {
    throw new Error("No request storage found");
  }
  return context;
};

/**
 * A safe way to attempt to get a value from request storage or return the default. The default value
 * will be returned in one of two scenarios: when the local storage is not setup; or when it does
 * not contain a non-null value for the given key.
 *
 * @param key key to retrieve value for from request storage
 * @param defaultVal default value when request storage is not active, or when there is no value defined
 */
export const getRequestStorageValueOrDefault = <T>(key: string, defaultVal: T): T => {
  const store = getRequestStore();
  if (store) {
    const value = store[key];
    return value ?? defaultVal;
  }
  return defaultVal;
};

/**
 * Fetch a request storage value or return null if not defined.
 *
 * @param key key to retrieve value for from request storage
 */
export const getRequestStorageValue = <T>(key: string): T | null => {
  return getRequestStorageValueOrDefault(key, null);
};

/**
 * Fetch a request storage value or throw an error if not defined.
 *
 * @param key key to retrieve value for from request storage
 * @param errorMsg error message to include if value does not exist
 */
export const getRequestStorageValueRequired = <T>(key: string, errorMsg?: string): T => {
  const nullable = getRequestStorageValue<T>(key);
  if (nullable === null) {
    throw new Error(errorMsg || `No request storage value exists for key: ${key}`);
  }
  return nullable;
};

/**
 * Sets a request storage value.
 * Request storage must be initialised before calling this method.
 *
 * @param key key of the value
 * @param value the value to set
 */
export const setRequestStorageValue = <T>(key: string, value: T): T => {
  const store = getRequestStoreRequired();
  store[key] = value;
  return value;
};
