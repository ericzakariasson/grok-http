import { type Usage } from "./usage.js";
import type { HttpMeta, IncompleteDetails, InputItem, OutputItem, ResponseStatus, XaiStreamEvent } from "./types.js";
export declare class XaiStream implements AsyncIterable<XaiStreamEvent>, AsyncDisposable {
    #private;
    id: string;
    status: ResponseStatus;
    output: OutputItem[];
    incomplete_details: IncompleteDetails | null;
    usage: Usage;
    http: HttpMeta;
    error: unknown;
    model?: string;
    constructor(init: {
        body: ReadableStream<Uint8Array> | null;
        http: HttpMeta;
        signal?: AbortSignal;
    });
    get parsed(): unknown | null;
    toText(): string;
    toInput(): InputItem[];
    toJson(): unknown;
    close(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
    [Symbol.asyncIterator](): AsyncGenerator<XaiStreamEvent>;
}
//# sourceMappingURL=stream.d.ts.map