import { responseParser } from "../shared/src/proxy-fetch";

const VALID_RESPONSE_DATA = {
  status: 200,
  statusText: "OK",
  url: "https://example.com",
  text: "Hello, world!",
};

const WITH_JSON_DATA = {
  ...VALID_RESPONSE_DATA,
  text: JSON.stringify({ message: "Hello, world!" }),
};

const UNIMPLMENTED_PROPERTIES = [
  "body",
  "bodyUsed",
  "type",
  "redirected",
  "headers",
];

const UNIMPLMENTED_METHODS = [
  "arrayBuffer",
  "blob",
  "bytes",
  "clone",
  "formData",
];

describe("responseParser", () => {
  it("throws if given an invalid response object", () => {
    const requiredKeys = ["status", "statusText", "url", "text"];

    for (const key of requiredKeys) {
      const invalidResponse = { ...VALID_RESPONSE_DATA, [key]: undefined };
      expect(() => responseParser(invalidResponse)).toThrow(
        "Missing key: " + key,
      );
    }
  });

  it("does not throw for a valid response object", () => {
    expect(() => responseParser(VALID_RESPONSE_DATA)).not.toThrow();
  });

  describe("response object", () => {
    it("has a json method", async () => {
      const response = responseParser(WITH_JSON_DATA);
      const data = await response.json();
      expect(data).toEqual({ message: "Hello, world!" });
    });

    it("has a text method", async () => {
      const response = responseParser(VALID_RESPONSE_DATA);
      const text = await response.text();
      expect(text).toBe("Hello, world!");
    });

    it("has an ok property", () => {
      const response = responseParser(VALID_RESPONSE_DATA);

      const stillFineResponse = responseParser({
        ...VALID_RESPONSE_DATA,
        status: 299,
      });

      const errorResponse = responseParser({
        ...VALID_RESPONSE_DATA,
        status: 300,
      });

      expect(response.ok).toBe(true);
      expect(stillFineResponse.ok).toBe(true);
      expect(errorResponse.ok).toBe(false);
    });

    it("has a status property", () => {
      const response = responseParser(VALID_RESPONSE_DATA);
      expect(response.status).toBe(200);
    });

    it("has a statusText property", () => {
      const response = responseParser(VALID_RESPONSE_DATA);
      expect(response.statusText).toBe("OK");
    });

    it("has a url property", () => {
      const response = responseParser(VALID_RESPONSE_DATA);
      expect(response.url).toBe("https://example.com");
    });

    it("throws if the unimplemented properties are accessed", () => {
      const response = responseParser(VALID_RESPONSE_DATA);
      for (const prop of UNIMPLMENTED_PROPERTIES) {
        expect(() => (response as Record<string, unknown>)[prop]).toThrow(
          `${prop} is not implemented yet`,
        );
      }
    });

    it("throws if the unimplemented methods are called", () => {
      const response = responseParser(VALID_RESPONSE_DATA);
      for (const method of UNIMPLMENTED_METHODS) {
        expect(() =>
          (response as unknown as Record<string, () => unknown>)[method](),
        ).toThrow(`${method} is not implemented yet`);
      }
    });
  });
});
