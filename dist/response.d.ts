import { type Usage } from "./usage.js";
import type { HttpMeta, IncompleteDetails, InputItem, OutputItem, ResponseStatus, WireResponse } from "./types.js";
export declare class XaiResponse {
    id: string;
    status: ResponseStatus;
    output: OutputItem[];
    incomplete_details: IncompleteDetails | null;
    usage: Usage;
    http: HttpMeta;
    object?: string;
    created_at?: number;
    completed_at?: number | null;
    model?: string;
    error?: unknown;
    [key: string]: unknown;
    constructor(wire: WireResponse | Record<string, unknown>, http: HttpMeta);
    get parsed(): unknown | null;
    toText(): string;
    toInput(): InputItem[];
    toJson(): unknown;
}
//# sourceMappingURL=response.d.ts.map