import path from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const appDir = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  transpilePackages: ["@xai/sdk"],
  turbopack: {
    // Parent repo lockfile would otherwise be inferred as the workspace root.
    root: path.resolve(appDir, "../.."),
  },
}

export default nextConfig
