import jsTestValues from "./__fixtures__/curriculum-helpers-javascript";

import { getFunctionParams, retryingTest } from "./../helpers/lib/index";

const {
  functionDeclaration,
  constFunction,
  letFunction,
  arrowFunction,
  destructuredArgsFunctionDeclaration,
} = jsTestValues;

describe("js-help", () => {
  describe("getFunctionArgs", () => {
    it("gets arguments from function declarations", () => {
      const parameters = getFunctionParams(functionDeclaration);
      expect(parameters[0].name).toBe("param1");
      expect(parameters[1].defaultValue).toBe("default");
      expect(parameters[1].name).toBe("param2");
      expect(parameters[2].name).toBe("param3");
    });
    it("gets arguments from const function variables", () => {
      const parameters = getFunctionParams(constFunction);
      expect(parameters[0].name).toBe("param1");
      expect(parameters[1].defaultValue).toBe("default");
      expect(parameters[1].name).toBe("param2");
      expect(parameters[2].name).toBe("param3");
    });
    it("gets arguments from let function variables", () => {
      const parameters = getFunctionParams(letFunction);
      expect(parameters[0].name).toBe("param1");
      expect(parameters[1].defaultValue).toBe("default");
      expect(parameters[1].name).toBe("param2");
      expect(parameters[2].name).toBe("param3");
    });
    it("gets arguments from arrow functions", () => {
      const parameters = getFunctionParams(arrowFunction);
      expect(parameters[0].name).toBe("name");
    });
    it("gets arguments from a destructured function declaration", () => {
      const parameters = getFunctionParams(destructuredArgsFunctionDeclaration);
      expect(parameters[0].name).toBe("a");
      expect(parameters[1].name).toBe("b");
      expect(parameters[2].name).toBe("c");
      expect(parameters[2].defaultValue).toBe("1");
      expect(parameters[3].name).toBe("...rest");
    });
  });

  describe("retryingTest", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      // Flush any remaining timers to prevent unhandled rejections
      vi.clearAllTimers();
    });

    it("should resolve immediately when test passes on first try", async () => {
      const testFn = vi.fn().mockReturnValue(true);

      const promise = retryingTest(testFn, "Test failed");

      await expect(promise).resolves.toBeUndefined();
      expect(testFn).toHaveBeenCalledTimes(1);
    });

    it("should resolve when test passes after retries", async () => {
      const testFn = vi
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const promise = retryingTest(testFn, "Test failed");

      // Run all timers and wait for the promise to settle
      vi.runAllTimers();

      await expect(promise).resolves.toBeUndefined();
      expect(testFn).toHaveBeenCalledTimes(3);
    });

    it("should reject with error message when all retries fail", async () => {
      const testFn = vi.fn().mockReturnValue(false);
      const errorMessage = "Element not found";

      const promise = retryingTest(testFn, errorMessage, 3);

      // Run all timers and wait for the promise to settle
      vi.runAllTimers();

      await expect(promise).rejects.toThrow(errorMessage);
      expect(testFn).toHaveBeenCalledTimes(3);
    });

    it("should reject immediately when tries is less than 1", async () => {
      const testFn = vi.fn();
      const errorMessage = "Invalid tries";

      const promise = retryingTest(testFn, errorMessage, 0);

      await expect(promise).rejects.toThrow(errorMessage);
      expect(testFn).not.toHaveBeenCalled();
    });

    it("should use default tries value of 20", async () => {
      const testFn = vi.fn().mockReturnValue(false);

      const promise = retryingTest(testFn, "Test failed");

      // Run all timers and wait for the promise to settle
      vi.runAllTimers();

      await expect(promise).rejects.toThrow("Test failed");
      expect(testFn).toHaveBeenCalledTimes(20);
    });

    it("should work with truthy values (not just boolean true)", async () => {
      const testFn = vi
        .fn()
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce("")
        .mockReturnValueOnce("found element"); // Truthy

      const promise = retryingTest(testFn, "Test failed");

      vi.runAllTimers();

      await expect(promise).resolves.toBeUndefined();
      expect(testFn).toHaveBeenCalledTimes(5);
    });

    it("should handle DOM element testing scenario", async () => {
      // Mock DOM element that appears after delay
      let mockElement: Element | null = null;
      const testFn = vi.fn(() => mockElement);

      // Simulate element appearing after 3 attempts
      setTimeout(() => {
        mockElement = { tagName: "IMG" } as Element;
      }, 3);

      const promise = retryingTest(testFn, "'img' element not found");

      vi.runAllTimers();

      await expect(promise).resolves.toBeUndefined();
      expect(testFn).toHaveBeenCalledTimes(4);
    });

    it("should wait 1ms between retries", async () => {
      const testFn = vi
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const promise = retryingTest(testFn, "Test failed");

      // Check that it hasn't resolved yet after 0ms
      expect(testFn).toHaveBeenCalledTimes(1);

      // Run all timers to complete the retry sequence
      vi.runAllTimers();

      await expect(promise).resolves.toBeUndefined();
      expect(testFn).toHaveBeenCalledTimes(2);
    });
  });
});
