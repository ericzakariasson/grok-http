const BRAND = Symbol.for("@xai/sdk:APIError");
export class APIError extends Error {
    request_id;
    status;
    code;
    body;
    [BRAND] = true;
    constructor(message, init = {}) {
        super(message, init.cause !== undefined ? { cause: init.cause } : undefined);
        this.name = new.target.name;
        this.request_id = init.request_id ?? null;
        this.status = init.status;
        this.code = init.code ?? null;
        this.body = init.body;
    }
    static is(err) {
        return typeof err === "object" && err !== null && BRAND in err;
    }
    isRateLimit() {
        return this instanceof RateLimitError || this.status === 429;
    }
    isOverloaded() {
        return this instanceof OverloadedError || this.status === 529;
    }
    isAbort() {
        return this instanceof AbortError;
    }
}
export class APIConnectionError extends APIError {
    constructor(message = "Connection error", init = {}) {
        super(message, init);
    }
}
export class TimeoutError extends APIError {
    constructor(message = "Request timed out", init = {}) {
        super(message, init);
    }
}
export class AbortError extends APIError {
    constructor(message = "Request aborted", init = {}) {
        super(message, init);
    }
}
export class APIStatusError extends APIError {
    constructor(message, init) {
        super(message, init);
    }
}
export class AuthenticationError extends APIStatusError {
    constructor(message = "Authentication failed", init = {}) {
        super(message, { ...init, status: 401 });
    }
}
export class PermissionDeniedError extends APIStatusError {
    constructor(message = "Permission denied", init = {}) {
        super(message, { ...init, status: 403 });
    }
}
export class NotFoundError extends APIStatusError {
    constructor(message = "Not found", init = {}) {
        super(message, { ...init, status: 404 });
    }
}
export class RateLimitError extends APIStatusError {
    constructor(message = "Rate limited", init = {}) {
        super(message, { ...init, status: 429 });
    }
}
export class OverloadedError extends APIStatusError {
    constructor(message = "Service overloaded", init = {}) {
        super(message, { ...init, status: 529 });
    }
}
const DROPPED_REASONING_MESSAGE = "pass response.toInput() (or include encrypted reasoning)";
export function rewriteStatusMessage(status, message) {
    if (status === 400 && /encrypted_content|encrypted reasoning/i.test(message)) {
        return DROPPED_REASONING_MESSAGE;
    }
    return message;
}
export function requestIdFromHeaders(headers) {
    return (headers.get("x-request-id") ??
        headers.get("request-id") ??
        headers.get("x-openai-request-id") ??
        null);
}
export function errorFromStatus(status, message, init = {}) {
    const rewritten = rewriteStatusMessage(status, message);
    const base = { ...init, status };
    switch (status) {
        case 401:
            return new AuthenticationError(rewritten, base);
        case 403:
            return new PermissionDeniedError(rewritten, base);
        case 404:
            return new NotFoundError(rewritten, base);
        case 429:
            return new RateLimitError(rewritten, base);
        case 529:
            return new OverloadedError(rewritten, base);
        default:
            return new APIStatusError(rewritten, { ...base, status });
    }
}
export async function errorFromResponse(res, body) {
    const request_id = requestIdFromHeaders(res.headers);
    let parsed = body;
    if (parsed === undefined) {
        const text = await res.text().catch(() => "");
        if (text) {
            try {
                parsed = JSON.parse(text);
            }
            catch {
                parsed = text;
            }
        }
    }
    let message = res.statusText || `HTTP ${res.status}`;
    let code = null;
    if (parsed && typeof parsed === "object") {
        const obj = parsed;
        const err = (obj.error && typeof obj.error === "object" ? obj.error : obj);
        if (typeof err.message === "string")
            message = err.message;
        if (typeof err.code === "string")
            code = err.code;
        else if (typeof err.code === "number")
            code = String(err.code);
    }
    else if (typeof parsed === "string" && parsed.length > 0) {
        message = parsed;
    }
    return errorFromStatus(statusOf(res), message, { request_id, code, body: parsed });
}
function statusOf(res) {
    return res.status;
}
export function errorFromAbort(signal, request_id) {
    const reason = signal.reason;
    if (reason instanceof APIError)
        return reason;
    if (reason && typeof reason === "object" && reason.name === "TimeoutError") {
        return new TimeoutError("Request timed out", { request_id, cause: reason });
    }
    if (reason instanceof DOMException && reason.name === "TimeoutError") {
        return new TimeoutError("Request timed out", { request_id, cause: reason });
    }
    const message = typeof reason === "string" && reason.length > 0
        ? reason
        : reason instanceof Error
            ? reason.message
            : "Request aborted";
    return new AbortError(message, { request_id, cause: reason });
}
export function errorFromUnknown(err, request_id) {
    if (APIError.is(err))
        return err;
    if (isTimeoutLike(err)) {
        return new TimeoutError(err instanceof Error ? err.message : "Request timed out", {
            request_id,
            cause: err,
        });
    }
    if (isAbortLike(err)) {
        return new AbortError(err instanceof Error ? err.message : "Request aborted", {
            request_id,
            cause: err,
        });
    }
    const message = err instanceof Error ? err.message : "Connection error";
    return new APIConnectionError(message, { request_id, cause: err });
}
export function isAbortLike(err) {
    if (APIError.is(err) && err.isAbort())
        return true;
    if (typeof err !== "object" || err === null)
        return false;
    return err.name === "AbortError";
}
function isTimeoutLike(err) {
    if (typeof err !== "object" || err === null)
        return false;
    return err.name === "TimeoutError";
}
export function streamErrorEvent(raw, request_id) {
    const codeRaw = raw.code;
    const codeNum = typeof codeRaw === "number" ? codeRaw : Number.parseInt(String(codeRaw ?? ""), 10);
    const message = typeof raw.message === "string" ? raw.message : "Stream error";
    let error;
    if (codeNum === 529 || /overloaded/i.test(message)) {
        error = new OverloadedError(message, { request_id, code: codeRaw != null ? String(codeRaw) : "529" });
    }
    else if (codeNum >= 400 && codeNum < 600) {
        error = errorFromStatus(codeNum, message, {
            request_id,
            code: codeRaw != null ? String(codeRaw) : null,
            body: raw,
        });
    }
    else {
        error = new APIError(message, {
            request_id,
            code: codeRaw != null ? String(codeRaw) : null,
            body: raw,
        });
    }
    return { event: { ...raw, type: "error", error }, error };
}
//# sourceMappingURL=errors.js.map