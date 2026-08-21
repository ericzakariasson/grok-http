/**
 * Incremental SSE parser. Yields parsed JSON objects (or `{ type: "ping" }`).
 * `data: [DONE]` ends the stream.
 */
export async function* parseSse(body, opts = {}) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (value && value.byteLength > 0)
                opts.onBytes?.();
            if (done) {
                const rest = flushBlocks(buf + decoder.decode());
                for (const item of rest.items) {
                    if (item === "[DONE]")
                        return;
                    yield item;
                }
                return;
            }
            buf += decoder.decode(value, { stream: true });
            const { items, rest } = flushBlocks(buf);
            buf = rest;
            for (const item of items) {
                if (item === "[DONE]")
                    return;
                yield item;
            }
        }
    }
    finally {
        try {
            reader.releaseLock();
        }
        catch {
            // already released
        }
    }
}
function flushBlocks(buf) {
    const parts = buf.split(/\r?\n\r?\n/);
    const rest = parts.pop() ?? "";
    const items = [];
    for (const block of parts) {
        const parsed = parseBlock(block);
        if (parsed !== undefined)
            items.push(parsed);
    }
    return { items, rest };
}
function parseBlock(block) {
    let eventName;
    const dataLines = [];
    for (const rawLine of block.split(/\r?\n/)) {
        const line = rawLine.replace(/^\uFEFF/, "");
        if (!line || line.startsWith(":"))
            continue;
        if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
            continue;
        }
        if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).replace(/^ /, ""));
            continue;
        }
    }
    if (dataLines.length === 0) {
        if (eventName === "ping")
            return { type: "ping" };
        return undefined;
    }
    const data = dataLines.join("\n");
    if (data === "[DONE]")
        return "[DONE]";
    try {
        const parsed = JSON.parse(data);
        if (eventName && isRecord(parsed) && parsed.type == null) {
            return { ...parsed, type: eventName };
        }
        return parsed;
    }
    catch {
        if (eventName === "ping")
            return { type: "ping" };
        return { type: "unknown", raw: data };
    }
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
export async function cancelStream(body) {
    if (!body)
        return;
    try {
        await body.cancel();
    }
    catch {
        // already cancelled
    }
}
//# sourceMappingURL=sse.js.map