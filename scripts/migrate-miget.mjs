import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = parseEnv(readFileSync(join(root, "web/backend/.env"), "utf8"));
const value = process.env.DATABASE_URL || env.DATABASE_URL;
if (!value) throw new Error("Set DATABASE_URL in web/backend/.env first.");

const url = new URL(value);
if (!url.hostname.endsWith(".onmiget.com")) {
  throw new Error("db:migrate:miget requires a Miget external database URL.");
}
url.searchParams.set("sslmode", "require");
url.searchParams.set("sslaccept", "accept_invalid_certs");
url.searchParams.set("uselibpqcompat", "true");
console.log(`Applying migrations to Miget database ${url.pathname.slice(1)} on ${url.hostname}.`);

function run(args, environment = process.env) {
  const result = spawnSync("docker", args, {
    cwd: root,
    env: environment,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const image = "replens-migrate:local";
const cached = spawnSync("docker", ["image", "inspect", image], { stdio: "ignore" });
if (cached.status !== 0) {
  run(["build", "-f", "web/backend/Dockerfile", "--target", "migration", "-t", image, "."]);
}
run([
  "run", "--rm", "-e", "DATABASE_URL",
  "-v", `${join(root, "web/backend/prisma")}:/workspace/web/backend/prisma:ro`,
  "-v", `${join(root, "web/backend/prisma.config.ts")}:/workspace/web/backend/prisma.config.ts:ro`,
  image,
], {
  ...process.env,
  DATABASE_URL: url.toString(),
});
