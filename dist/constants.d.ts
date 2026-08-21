export declare const DEFAULT_BASE_URL = "https://api.x.ai/v1";
export declare const DEFAULT_TIMEOUT_MS = 3600000;
export declare const DEFAULT_IDLE_TIMEOUT_MS = 60000;
export declare const DEFAULT_MAX_RETRIES = 2;
/** Wire default is true (stored 30 days). This client defaults to false. */
export declare const SDK_STORE_DEFAULT = false;
export declare const ENCRYPTED_REASONING: "reasoning.encrypted_content";
export declare const KNOWN_STREAM_EVENT_TYPES: readonly ["ping", "error", "response.created", "response.in_progress", "response.completed", "response.failed", "response.incomplete", "response.output_item.added", "response.output_item.done", "response.content_part.added", "response.content_part.done", "response.output_text.delta", "response.output_text.done", "response.reasoning_text.delta", "response.reasoning_text.done", "response.reasoning_summary_text.delta", "response.reasoning_summary_text.done", "response.function_call_arguments.delta", "response.function_call_arguments.done"];
export type KnownStreamEventType = (typeof KNOWN_STREAM_EVENT_TYPES)[number];
export declare function isKnownStreamEventType(type: string): type is KnownStreamEventType;
export declare const RETRYABLE_STATUS: Set<number>;
//# sourceMappingURL=constants.d.ts.map