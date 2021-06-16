export class Provider<T> {
  private value: T | null;

  constructor(value?: T) {
    this.value = value || null;
  }

  get(): T {
    if (this.value === null) {
      throw new Error("No value has been set");
    }
    return this.value;
  }

  getWithDefault(defaultVal: T): T {
    return this.value || defaultVal;
  }

  set(value: T): T {
    return (this.value = value);
  }
}
