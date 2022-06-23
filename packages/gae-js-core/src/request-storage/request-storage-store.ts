import {
  getRequestStorageValue,
  getRequestStorageValueOrDefault,
  getRequestStorageValueRequired,
  setRequestStorageValue,
} from "./request-storage";
import { DataValidator } from "../util";

export class RequestStorageStore<T> {
  constructor(public key: string, public validator?: DataValidator<T>) {}

  get(): T | null {
    return getRequestStorageValue(this.key);
  }

  getWithDefault(defaultVal: T): T {
    return getRequestStorageValueOrDefault(this.key, defaultVal);
  }

  getRequired(errorMsg?: string): T {
    return getRequestStorageValueRequired(this.key, errorMsg);
  }

  set(value: T): T {
    const validated = this.validator?.(value) || value;
    return setRequestStorageValue(this.key, validated);
  }
}
