import { MockLocalStorage } from "../dom-evaluator/src/mock-local-storage";

describe("MockLocalStorage", () => {
  describe("length", () => {
    it("should be 0 when initialized", () => {
      const localStorage = new MockLocalStorage();
      expect(localStorage).toHaveLength(0);
    });

    it("should return the number of items stored", () => {
      const localStorage = new MockLocalStorage();

      localStorage.setItem("key1", "value1");
      expect(localStorage).toHaveLength(1);

      localStorage.setItem("key2", "value2");
      expect(localStorage).toHaveLength(2);
    });
  });

  describe("getItem and setItem", () => {
    it("should store and retrieve items", () => {
      const localStorage = new MockLocalStorage();
      localStorage.setItem("key", "value");
      expect(localStorage.getItem("key")).toBe("value");
    });

    it('should convert objects to "[object <Type>]" when set', () => {
      const localStorage = new MockLocalStorage();

      localStorage.setItem("obj", { a: 1, b: 2 });
      localStorage.setItem("map", new Map([["key", "value"]]));

      expect(localStorage.getItem("obj")).toBe("[object Object]");
      expect(localStorage.getItem("map")).toBe("[object Map]");
    });

    it("should join arrays with commas when set", () => {
      const localStorage = new MockLocalStorage();
      localStorage.setItem("array", ["value1", "value2"]);
      expect(localStorage.getItem("array")).toBe("value1,value2");
    });

    it("should return null for non-existent keys", () => {
      const localStorage = new MockLocalStorage();
      expect(localStorage.getItem("nonExistentKey")).toBe(null);
    });

    it('should return "" if the value exists, but is the empty string', () => {
      const localStorage = new MockLocalStorage();
      localStorage.setItem("emptyString", "");
      expect(localStorage.getItem("emptyString")).toBe("");
    });
  });

  describe("removeItem", () => {
    it("should be remove an item by key", () => {
      const localStorage = new MockLocalStorage();
      localStorage.setItem("key", "value");
      localStorage.removeItem("key");
      expect(localStorage.getItem("key")).toBe(null);
    });

    it("should do nothing when removing a non-existent key", () => {
      const localStorage = new MockLocalStorage();
      localStorage.removeItem("nonExistentKey");
      expect(localStorage).toHaveLength(0);
    });
  });

  describe("clear", () => {
    it("should clear all items", () => {
      const localStorage = new MockLocalStorage();
      localStorage.setItem("key1", "value1");
      localStorage.setItem("key2", "value2");

      localStorage.clear();

      expect(localStorage.length).toBe(0);
      expect(localStorage.getItem("key1")).toBe(null);
      expect(localStorage.getItem("key2")).toBe(null);
    });
  });

  describe("key", () => {
    it("should get the key at a specific index", () => {
      const localStorage = new MockLocalStorage();
      localStorage.setItem("key1", "value1");
      localStorage.setItem("key2", "value2");

      expect(localStorage.key(0)).toBe("key1");
      expect(localStorage.key(1)).toBe("key2");
      expect(localStorage.key(2)).toBe(null);
    });

    it('should return "" if a key is the empty string', () => {
      const localStorage = new MockLocalStorage();

      localStorage.setItem("", "value");

      expect(localStorage.key(0)).toBe("");
    });
  });
});
