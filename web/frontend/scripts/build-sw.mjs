import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const assets = (await readdir(path.join(dist, "assets")))
  .filter((file) => /\.(js|css|svg|png|woff2?)$/.test(file))
  .sort();
const files = [
  "/index.html",
  "/manifest.webmanifest",
  "/icons/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  ...assets.map((name) => `/assets/${name}`),
];
const template = await readFile(
  new URL("./sw-template.js", import.meta.url),
  "utf8",
);
const hash = createHash("sha256").update(template);
for (const file of files) hash.update(await readFile(path.join(dist, file)));
const worker = template
  .replace(
    "__CACHE_NAME__",
    JSON.stringify(`replens-shell-${hash.digest("hex").slice(0, 12)}`),
  )
  .replace("__PRECACHE_FILES__", JSON.stringify(files));
await writeFile(path.join(dist, "sw.js"), worker);
console.log(`PWA service worker generated with ${files.length} public assets.`);
