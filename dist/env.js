function nodeProcess() {
    const proc = globalThis.process;
    return proc;
}
export function isNode() {
    return Boolean(nodeProcess()?.versions?.node);
}
export function assertNodeVersion() {
    const raw = nodeProcess()?.versions?.node;
    if (!raw)
        return;
    const major = Number.parseInt(raw.split(".")[0] ?? "0", 10);
    if (major < 22) {
        throw new Error(`@xai/sdk requires Node.js 22 or later (found ${raw})`);
    }
}
export function readEnvApiKey() {
    const key = nodeProcess()?.env?.XAI_API_KEY;
    return key && key.length > 0 ? key : undefined;
}
export function debugEnabled() {
    return nodeProcess()?.env?.XAI_DEBUG === "1";
}
//# sourceMappingURL=env.js.map