import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const runtimeVersion = '1.1.1';
const modelRevision = 'float16/1';
const packageBase = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${runtimeVersion}/wasm/`;
const modelUrl = `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/${modelRevision}/pose_landmarker_full.task`;
const assets = [
  ...['vision_wasm_internal', 'vision_wasm_module_internal', 'vision_wasm_nosimd_internal'].flatMap(name => [
    { filename: `${name}.js`, source: `${packageBase}${name}.js` },
    { filename: `${name}.wasm`, source: `${packageBase}${name}.wasm` },
  ]),
  { filename: 'pose_landmarker_full_v1.task', source: modelUrl },
];
const expectedHashes = {
  'vision_wasm_internal.js': '6522286aa32dd93eff17c3da002b0649516f87abfec7a80b5bfe5c9625caa5f8',
  'vision_wasm_internal.wasm': '0e101a010e262ef8e78f22e3c95b60a9705fd06962753c9acd6356d9fb56b7bd',
  'vision_wasm_module_internal.js': '539a4386fd12d0723d6e900ec80467d168ba7290dda2f79e77a2181b8e906115',
  'vision_wasm_module_internal.wasm': '3b57e4b55ac6346bf940212e3e11250b308a6a474077385e2f527b119cf74525',
  'vision_wasm_nosimd_internal.js': '942654dbdcebce08ea039af23d18e58bebf23c8607d74023d2df7071c8a7b638',
  'vision_wasm_nosimd_internal.wasm': 'c9b1b69bb87baf9e529254d8559dcbcf4c5a9c0eda84f56a12f17d675335ec9c',
  'pose_landmarker_full_v1.task': '5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1',
};
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const target = resolve(process.env.TRACKING_ASSET_DIR ?? join(repositoryRoot, 'models/mediapipe/1.1.1'));
const staging = `${target}.staging-${process.pid}`;
const maxBytes = 32 * 1024 * 1024;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function download(asset) {
  const response = await fetch(asset.source, { signal: AbortSignal.timeout(60_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Asset download failed (${response.status}): ${asset.filename}`);
  const declaredSize = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) throw new Error(`Unexpected asset size: ${asset.filename}`);
  if (!response.body) throw new Error(`Asset download had no body: ${asset.filename}`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error(`Unexpected asset size: ${asset.filename}`);
    }
    chunks.push(Buffer.from(value));
  }
  const bytes = Buffer.concat(chunks, size);
  if (bytes.length === 0) throw new Error(`Unexpected asset size: ${asset.filename}`);
  const sha256 = digest(bytes);
  if (sha256 !== expectedHashes[asset.filename]) throw new Error(`Pinned asset hash changed: ${asset.filename}`);
  return { ...asset, bytes, sha256, size: bytes.length };
}

async function atomicWrite(path, bytes) {
  const temporaryPath = `${path}.tmp-${process.pid}`;
  await writeFile(temporaryPath, bytes, { flag: 'wx' });
  await rename(temporaryPath, path);
}

async function verifyExisting(downloaded, manifest) {
  const existing = JSON.parse(await readFile(join(target, 'manifest.json'), 'utf8'));
  if (JSON.stringify(existing) !== JSON.stringify(manifest)) throw new Error(`Existing asset version at ${target} has different provenance or hashes; refusing to overwrite immutable assets.`);
  for (const asset of downloaded) {
    const bytes = await readFile(join(target, asset.filename));
    if (digest(bytes) !== asset.sha256) throw new Error(`Existing asset hash mismatch: ${asset.filename}`);
  }
}

await mkdir(dirname(target), { recursive: true });
await rm(staging, { recursive: true, force: true });
try {
  const downloaded = await Promise.all(assets.map(download));
  const manifest = {
    formatVersion: 1,
    runtime: { package: '@mediapipe/tasks-vision', version: runtimeVersion, source: `https://www.npmjs.com/package/@mediapipe/tasks-vision/v/${runtimeVersion}` },
    model: { name: 'pose_landmarker_full', revision: modelRevision, source: modelUrl },
    assets: downloaded.map(({ filename, source, sha256, size }) => ({ filename, source, sha256, size })),
  };
  try {
    await readFile(join(target, 'manifest.json'));
    await verifyExisting(downloaded, manifest);
    console.log(`Verified immutable MediaPipe assets at ${target}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    await mkdir(staging, { recursive: true });
    for (const asset of downloaded) await atomicWrite(join(staging, asset.filename), asset.bytes);
    await atomicWrite(join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await rename(staging, target);
    console.log(`Prepared ${downloaded.length} MediaPipe assets at ${target}`);
  }
} finally {
  await rm(staging, { recursive: true, force: true });
}
