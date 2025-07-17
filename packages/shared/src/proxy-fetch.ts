import { post, type Messenger } from "./awaitable-post";

export const createFetchProxy =
  (messenger: Messenger<unknown>) => (url: string) =>
    post({ messenger, message: { type: "fetch", url } });
