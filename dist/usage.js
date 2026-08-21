function int(value, fallback = 0) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function intOrNull(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function emptyUsage() {
    return {
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        input_tokens_details: { cached_tokens: 0 },
        output_tokens_details: { reasoning_tokens: 0 },
        num_sources_used: 0,
        num_server_side_tools_used: 0,
        cost_usd: null,
        cost_in_nano_usd: null,
    };
}
/**
 * Map a wire usage object. `cost_usd` is nano / 1e9 when `cost_in_nano_usd` is present.
 * Completed results always surface a Usage object even if the wire omitted it.
 */
export function mapUsage(raw) {
    const u = raw && typeof raw === "object" ? raw : {};
    const detailsIn = u.input_tokens_details && typeof u.input_tokens_details === "object"
        ? u.input_tokens_details
        : {};
    const detailsOut = u.output_tokens_details && typeof u.output_tokens_details === "object"
        ? u.output_tokens_details
        : {};
    const nano = intOrNull(u.cost_in_nano_usd);
    const ticks = intOrNull(u.cost_in_usd_ticks);
    const usage = {
        input_tokens: int(u.input_tokens),
        output_tokens: int(u.output_tokens),
        total_tokens: int(u.total_tokens),
        input_tokens_details: { cached_tokens: int(detailsIn.cached_tokens) },
        output_tokens_details: { reasoning_tokens: int(detailsOut.reasoning_tokens) },
        num_sources_used: int(u.num_sources_used),
        num_server_side_tools_used: int(u.num_server_side_tools_used),
        cost_in_nano_usd: nano,
        cost_usd: nano != null ? nano / 1e9 : null,
    };
    if (ticks != null)
        usage.cost_in_usd_ticks = ticks;
    if (u.server_side_tool_usage_details && typeof u.server_side_tool_usage_details === "object") {
        usage.server_side_tool_usage_details = u.server_side_tool_usage_details;
    }
    return usage;
}
//# sourceMappingURL=usage.js.map