import type { components } from "./generated/types.js";
export type WireInputItem = components["schemas"]["InputItem"];
export type WireOutputItem = components["schemas"]["OutputItem"];
export type WireCreateRequest = components["schemas"]["CreateResponseRequest"];
export type WireResponse = components["schemas"]["ResponseObject"];
export type WireStreamEvent = components["schemas"]["StreamEvent"];
export type ResponseStatus = components["schemas"]["ResponseStatus"];
export type IncompleteDetails = components["schemas"]["IncompleteDetails"];
export type OutputMessage = components["schemas"]["OutputMessage"];
export type ReasoningItem = components["schemas"]["ReasoningItem"];
export type FunctionCallItem = components["schemas"]["FunctionCallItem"];
export type IncludeField = components["schemas"]["IncludeField"];
export type DeletedResponse = components["schemas"]["DeletedResponse"];
export type InputItemList = components["schemas"]["InputItemList"];
export type Model = components["schemas"]["Model"];
export type ModelList = components["schemas"]["ModelList"];
export type TextFormat = components["schemas"]["TextFormat"];
export type PorcelainImagePart = {
    type: "input_image";
    image: Blob | File;
    detail?: "auto" | "low" | "high";
};
export type InputContentPart = components["schemas"]["InputContentPart"] | PorcelainImagePart;
export type EasyInputMessage = {
    role: "user" | "assistant" | "system" | "developer";
    content: string | InputContentPart[];
    type?: "message";
    id?: string;
    status?: string;
};
export type InputItem = EasyInputMessage | Exclude<WireInputItem, components["schemas"]["EasyInputMessage"] | components["schemas"]["InputMessage"]> | {
    type: "message";
    role: "user" | "assistant" | "system" | "developer";
    content: string | InputContentPart[];
    id?: string;
    status?: string;
};
export type OutputItem = WireOutputItem;
export type CreateParams = Omit<WireCreateRequest, "input" | "stream" | "store"> & {
    input: string | InputItem[];
    stream?: boolean;
    /**
     * Persist the response for later `get` / `previous_response_id`.
     * SDK default is **false**. The API wire default is true (stored for 30 days).
     * When false and `include` is unset, the client sends
     * `['reasoning.encrypted_content']`.
     */
    store?: boolean | null;
};
export type RequestHook = (request: Request) => void | Promise<void>;
export type ResponseHook = (response: Response) => void | Promise<void>;
export type ClientOptions = {
    apiKey?: string;
    fetch?: typeof fetch;
    baseURL?: string;
    timeout?: number;
    idleTimeout?: number;
    maxRetries?: number;
    defaultHeaders?: Record<string, string>;
    onRequest?: RequestHook;
    onResponse?: ResponseHook;
};
export type RequestOpts = {
    signal?: AbortSignal;
    timeout?: number;
    idleTimeout?: number;
    maxRetries?: number;
    headers?: HeadersInit;
    http?: {
        body?: boolean;
    };
};
export type HttpMeta = {
    status: number;
    headers: Headers;
    requestId: string | null;
    body?: unknown;
};
export type UnknownStreamEvent = {
    type: "unknown";
    raw: unknown;
};
export type ErrorStreamEvent = Extract<WireStreamEvent, {
    type: "error";
}> & {
    error?: import("./errors.js").APIError;
};
export type XaiStreamEvent = Exclude<WireStreamEvent, {
    type: "error";
}> | ErrorStreamEvent | UnknownStreamEvent;
//# sourceMappingURL=types.d.ts.map