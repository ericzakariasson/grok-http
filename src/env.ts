type NodeProcess = {
  versions?: { node?: string };
  env?: Record<string, string | undefined>;
};

function nodeProcess(): NodeProcess | undefined {
  const proc = (globalThis as { process?: NodeProcess }).process;
  return proc;
}

export function isNode(): boolean {
  return Boolean(nodeProcess()?.versions?.node);
}

export function assertNodeVersion(): void {
  const raw = nodeProcess()?.versions?.node;
  if (!raw) return;
  const major = Number.parseInt(raw.split(".")[0] ?? "0", 10);
  if (major < 22) {
    throw new Error(`@xai/sdk requires Node.js 22 or later (found ${raw})`);
  }
}

export function readEnvApiKey(): string | undefined {
  const key = nodeProcess()?.env?.XAI_API_KEY;
  return key && key.length > 0 ? key : undefined;
}

export function debugEnabled(): boolean {
  return nodeProcess()?.env?.XAI_DEBUG === "1";
}
