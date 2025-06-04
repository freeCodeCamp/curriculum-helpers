import { post } from "./awaitable-post";

// Echos the post data back
class MockWorker {
  // Simulate posting a message to the worker
  postMessage<T>(msg: T, opts: WindowPostMessageOptions) {
    opts.transfer?.forEach((transferable) => {
      if (transferable instanceof MessagePort) {
        transferable.postMessage(msg);
      }
    });
  }
}

describe("post", () => {
  it("should resolve with the post data", async () => {
    const postData = { id: 1, title: "Test Post" };
    const mockWorker = new MockWorker();
    const result = await post({ messenger: mockWorker, message: postData });
    expect(result).toEqual(postData);
  });

  it("should handle multiple messages", async () => {
    const mockWorker = new MockWorker();
    const postData1 = { id: 1, title: "First Post" };
    const postData2 = { id: 2, title: "Second Post" };
    const result1 = post({ messenger: mockWorker, message: postData1 });
    const result2 = post({ messenger: mockWorker, message: postData2 });
    const [res1, res2] = await Promise.all([result1, result2]);
    expect(res1).toEqual(postData1);
    expect(res2).toEqual(postData2);
  });
});
