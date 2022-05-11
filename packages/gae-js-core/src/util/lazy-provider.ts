export class LazyProvider<T> {
  private value?: T;

  constructor(private readonly init: () => T) {}

  get(): T {
    if (!this.value) {
      this.value = this.init();
    }
    return this.value;
  }

  clear() {
    this.value = undefined;
  }
}
