export const DEFAULT_BASE_URL = "https://api.x.ai/v1";
export const DEFAULT_TIMEOUT_MS = 3_600_000;
export const DEFAULT_IDLE_TIMEOUT_MS = 60_000;
export const DEFAULT_MAX_RETRIES = 2;
/** Wire default is true (stored 30 days). This client defaults to false. */
export const SDK_STORE_DEFAULT = false;
export const ENCRYPTED_REASONING = "reasoning.encrypted_content";
export const KNOWN_STREAM_EVENT_TYPES = [
    "ping",
    "error",
    "response.created",
    "response.in_progress",
    "response.completed",
    "response.failed",
    "response.incomplete",
    "response.output_item.added",
    "response.output_item.done",
    "response.content_part.added",
    "response.content_part.done",
    "response.output_text.delta",
    "response.output_text.done",
    "response.reasoning_text.delta",
    "response.reasoning_text.done",
    "response.reasoning_summary_text.delta",
    "response.reasoning_summary_text.done",
    "response.function_call_arguments.delta",
    "response.function_call_arguments.done",
];
const KNOWN_SET = new Set(KNOWN_STREAM_EVENT_TYPES);
export function isKnownStreamEventType(type) {
    return KNOWN_SET.has(type);
}
export const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504, 529]);
//# sourceMappingURL=constants.js.map