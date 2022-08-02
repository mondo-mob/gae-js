export class LazyProvider<T> {
  private value?: T;

  constructor(private readonly init: () => T) {}

  get(): T {
    if (!this.value) {
      this.value = this.init();
    }
    return this.value;
  }

  set(value: T): T {
    return (this.value = value);
  }

  clear() {
    this.value = undefined;
  }
}
