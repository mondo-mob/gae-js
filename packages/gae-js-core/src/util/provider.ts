export class Provider<T> {
  private noValueMessage: string;
  private value: T | null;

  constructor(value?: T, noValueMessage?: string) {
    this.value = value || null;
    this.noValueMessage = noValueMessage || "No value has been set on this provider";
  }

  get(): T {
    if (this.value === null) {
      throw new Error(this.noValueMessage);
    }
    return this.value;
  }

  getWithDefault(defaultVal: T): T {
    return this.value || defaultVal;
  }

  set(value: T): T {
    return (this.value = value);
  }

  hasValue(): boolean {
    return !!this.value;
  }
}
