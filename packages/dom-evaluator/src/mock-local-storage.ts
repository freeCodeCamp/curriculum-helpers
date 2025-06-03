export class MockLocalStorage implements Storage {
  #storage: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.#storage).length;
  }

  setItem(key: string, value: unknown): void {
    this.#storage[key] = String(value);
  }

  key(index: number): string | null {
    const keys = Object.keys(this.#storage);
    return keys[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.#storage[key] ?? null;
  }

  removeItem(key: string): void {
    delete this.#storage[key];
  }

  clear(): void {
    this.#storage = {};
  }
}
