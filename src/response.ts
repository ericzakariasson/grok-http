import { parseJsonOutput, toInput, toText } from "./porcelain.js";
import { mapUsage, type Usage } from "./usage.js";
import type {
  HttpMeta,
  IncompleteDetails,
  InputItem,
  OutputItem,
  ResponseStatus,
  WireResponse,
} from "./types.js";

export class XaiResponse {
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

  constructor(wire: WireResponse | Record<string, unknown>, http: HttpMeta) {
    const rec = wire as Record<string, unknown>;
    Object.assign(this, rec);
    this.id = typeof rec.id === "string" ? rec.id : "";
    this.status = (typeof rec.status === "string" ? rec.status : "in_progress") as ResponseStatus;
    this.output = Array.isArray(rec.output) ? (rec.output as OutputItem[]) : [];
    this.incomplete_details = (rec.incomplete_details as IncompleteDetails | null) ?? null;
    this.usage = mapUsage(rec.usage);
    this.http = http;
  }

  get parsed(): unknown | null {
    return parseJsonOutput(this.output, this.status, false);
  }

  toText(): string {
    return toText(this.output);
  }

  toInput(): InputItem[] {
    return toInput(this.output);
  }

  toJson(): unknown {
    return parseJsonOutput(this.output, this.status, true);
  }
}
