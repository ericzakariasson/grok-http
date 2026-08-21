import type { CreateParams, InputItem, OutputItem } from "./types.js";
import type { FunctionCallItem, OutputMessage, ReasoningItem } from "./types.js";
export declare function isMessage(item: unknown): item is OutputMessage;
export declare function isReasoning(item: unknown): item is ReasoningItem;
export declare function isFunctionCall(item: unknown): item is FunctionCallItem;
export declare function toText(output: readonly OutputItem[]): string;
/** Echoes all output items, including reasoning, for the next turn. */
export declare function toInput(output: readonly OutputItem[]): InputItem[];
export declare function parseJsonOutput(output: readonly OutputItem[], status: string, throwOnFail: boolean): unknown;
/**
 * Convert porcelain `image: Blob | File` parts to wire `image_url` data URLs.
 */
export declare function inlineBlobs(input: string | InputItem[]): Promise<string | InputItem[]>;
/**
 * Apply SDK defaults. `store` wire default is true (30 days); SDK default is false.
 * When `store` is false and `include` is unset, send `['reasoning.encrypted_content']`.
 */
export declare function applyCreateDefaults(body: CreateParams): Record<string, unknown>;
//# sourceMappingURL=porcelain.d.ts.map