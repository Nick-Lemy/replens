import { spawnSync } from "node:child_process";
import { chmodSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const existing = spawnSync("git", ["config", "--get", "core.hooksPath"], {
  cwd: root,
  encoding: "utf8",
});

if (existing.error || ![0, 1].includes(existing.status)) {
  console.error("Cannot read Git configuration. Run this inside a Git checkout.");
  process.exit(1);
}
if (existing.status === 0 && existing.stdout.trim() !== ".githooks") {
  console.error(`A different hooks directory is already configured: ${existing.stdout.trim()}`);
  console.error("Review that configuration before replacing it with .githooks.");
  process.exit(1);
}

for (const name of ["pre-commit", "pre-push"]) {
  chmodSync(new URL(`../.githooks/${name}`, import.meta.url), 0o755);
}

const configured = spawnSync("git", ["config", "--local", "core.hooksPath", ".githooks"], {
  cwd: root,
  stdio: "inherit",
});
if (configured.error || configured.status !== 0) {
  console.error("Could not activate hooks. Run pnpm hooks:install in your terminal.");
  process.exit(1);
}
console.log("RepLens pre-commit and pre-push hooks are active.");
