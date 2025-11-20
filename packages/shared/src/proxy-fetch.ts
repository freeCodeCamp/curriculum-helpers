import { post, type Messenger } from "./awaitable-post";

export const createFetchProxy =
  (messenger: Messenger<unknown>) =>
  async (url: string, options?: RequestInit) => {
    const message = {
      type: "fetch",
      url,
      ...(options && { options }),
    };
    const resData = await post({ messenger, message });

    return responseParser(resData);
  };

type ResponseData = {
  status: number;
  statusText: string;
  url: string;
  text: string;
};

type CustomResponse = {
  status: number;
  statusText: string;
  url: string;
  ok: boolean;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
};

function assertIsResponse(response: unknown): asserts response is ResponseData {
  if (typeof response !== "object" || response === null) {
    throw Error("Invalid response object");
  }

  const requiredKeys: (keyof ResponseData)[] = [
    "status",
    "statusText",
    "url",
    "text",
  ];

  for (const key of requiredKeys) {
    if (
      !(key in response) ||
      (response as Record<string, unknown>)[key] === undefined
    ) {
      throw Error(`Missing key: ${key}`);
    }
  }
}

const notImplemented = (name: string) => {
  throw Error(`${name} is not implemented yet`);
};

export const responseParser = (obj: unknown): CustomResponse => {
  assertIsResponse(obj);

  const response = {
    status: obj.status,
    statusText: obj.statusText,
    url: obj.url,
    text: () => Promise.resolve(obj.text),
    ok: obj.status >= 200 && obj.status < 300,
    json() {
      return Promise.resolve(JSON.parse(obj.text));
    },
    get body() {
      return notImplemented("body");
    },
    get bodyUsed() {
      return notImplemented("bodyUsed");
    },
    get headers() {
      return notImplemented("headers");
    },
    get type() {
      return notImplemented("type");
    },
    get redirected() {
      return notImplemented("redirected");
    },

    arrayBuffer() {
      return notImplemented("arrayBuffer");
    },
    blob() {
      return notImplemented("blob");
    },
    bytes() {
      return notImplemented("bytes");
    },
    clone() {
      return notImplemented("clone");
    },
    formData() {
      return notImplemented("formData");
    },
  };

  return response;
};
