import type { components } from "./generated/types.js";
export type WireUsage = components["schemas"]["Usage"];
export type ServerSideToolUsageDetails = components["schemas"]["ServerSideToolUsageDetails"];
export type Usage = {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    input_tokens_details: {
        cached_tokens: number;
    };
    output_tokens_details: {
        reasoning_tokens: number;
    };
    num_sources_used: number;
    num_server_side_tools_used: number;
    cost_usd: number | null;
    cost_in_nano_usd: number | null;
    cost_in_usd_ticks?: number | null;
    server_side_tool_usage_details?: ServerSideToolUsageDetails;
};
export declare function emptyUsage(): Usage;
/**
 * Map a wire usage object. `cost_usd` is nano / 1e9 when `cost_in_nano_usd` is present.
 * Completed results always surface a Usage object even if the wire omitted it.
 */
export declare function mapUsage(raw: unknown): Usage;
//# sourceMappingURL=usage.d.ts.map