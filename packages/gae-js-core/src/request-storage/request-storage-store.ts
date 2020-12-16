import {
  getRequestStorageValue,
  getRequestStorageValueOrDefault,
  getRequestStorageValueRequired,
  setRequestStorageValue,
} from "./request-storage";

export class RequestStorageStore<T> {
  constructor(public key: string) {}

  get(): T | null {
    return getRequestStorageValue(this.key);
  }

  getWithDefault(defaultVal: T): T {
    return getRequestStorageValueOrDefault(this.key, defaultVal);
  }

  getRequired(): T {
    return getRequestStorageValueRequired(this.key);
  }

  set(value: T): T {
    return setRequestStorageValue(this.key, value);
  }
}
