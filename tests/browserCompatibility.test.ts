import { describe, expect, it } from "vitest";
import { installReadableStreamAsyncIteratorPolyfill } from "../src/browserCompatibility";

describe("installReadableStreamAsyncIteratorPolyfill", () => {
  it("adds async iteration support when ReadableStream does not provide it", async () => {
    const prototype = ReadableStream.prototype as ReadableStream<Uint8Array> & {
      [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array>;
    };
    const originalDescriptor = Object.getOwnPropertyDescriptor(prototype, Symbol.asyncIterator);

    try {
      Reflect.deleteProperty(prototype, Symbol.asyncIterator);
      installReadableStreamAsyncIteratorPolyfill();

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          controller.enqueue(new Uint8Array([2]));
          controller.close();
        },
      });

      const values: number[] = [];
      for await (const chunk of stream) {
        values.push(chunk[0]);
      }

      expect(values).toEqual([1, 2]);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(prototype, Symbol.asyncIterator, originalDescriptor);
      } else {
        Reflect.deleteProperty(prototype, Symbol.asyncIterator);
      }
    }
  });
});
