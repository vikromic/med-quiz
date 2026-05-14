export function installReadableStreamAsyncIteratorPolyfill(): void {
  const readableStream = globalThis.ReadableStream;
  if (!readableStream) {
    return;
  }

  const prototype = readableStream.prototype as ReadableStream<unknown> & {
    [Symbol.asyncIterator]?: () => AsyncIterableIterator<unknown>;
  };

  if (typeof prototype[Symbol.asyncIterator] === "function") {
    return;
  }

  Object.defineProperty(prototype, Symbol.asyncIterator, {
    configurable: true,
    writable: true,
    value: async function* readableStreamAsyncIterator<T>(
      this: ReadableStream<T>,
    ): AsyncIterableIterator<T> {
      const reader = this.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            return;
          }
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    },
  });
}

export function installBrowserCompatibilityPolyfills(): void {
  installReadableStreamAsyncIteratorPolyfill();
}
