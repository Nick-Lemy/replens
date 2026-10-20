import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = path.resolve(frontendRoot, "../..");
const dist = path.join(frontendRoot, "dist");

function getApiOrigin(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Netlify builds require API_UPSTREAM_ORIGIN to be set to the HTTPS API origin.");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("API_UPSTREAM_ORIGIN must be a valid HTTPS origin without a path, query, or fragment.");
  }

  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("API_UPSTREAM_ORIGIN must be an HTTPS origin without credentials, path, query, or fragment.");
  }

  return url.origin;
}

const apiOrigin = getApiOrigin(process.env.API_UPSTREAM_ORIGIN);
const build = spawnSync("pnpm", ["--filter", "@replens/frontend", "build"], {
  cwd: repoRoot,
  env: process.env,
  stdio: "inherit",
});

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

await mkdir(dist, { recursive: true });
await writeFile(
  path.join(dist, "_redirects"),
  `/api/* ${apiOrigin}/api/:splat 200!\n`,
);
console.log("Generated forced same-origin API proxy for Netlify.");
