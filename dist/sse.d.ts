/**
 * Incremental SSE parser. Yields parsed JSON objects (or `{ type: "ping" }`).
 * `data: [DONE]` ends the stream.
 */
export declare function parseSse(body: ReadableStream<Uint8Array>, opts?: {
    onBytes?: () => void;
}): AsyncGenerator<unknown>;
export declare function cancelStream(body: ReadableStream<Uint8Array> | null): Promise<void>;
//# sourceMappingURL=sse.d.ts.map