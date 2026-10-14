import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

// Exercise the generated worker without a browser, network, or project dependencies.
test("PWA caches the public shell and leaves private requests untouched", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "replens-pwa-test-"));
  try {
    await mkdir(path.join(root, "scripts"), { recursive: true });
    await cp(
      new URL("./build-sw.mjs", import.meta.url),
      path.join(root, "scripts/build-sw.mjs"),
    );
    await cp(
      new URL("./sw-template.js", import.meta.url),
      path.join(root, "scripts/sw-template.js"),
    );
    const paths = [
      "index.html",
      "manifest.webmanifest",
      "icons/favicon.svg",
      "icons/icon-192.png",
      "icons/icon-512.png",
      "icons/apple-touch-icon.png",
      "assets/app.js",
      "assets/app.css",
    ];
    for (const file of paths) {
      await mkdir(path.dirname(path.join(root, "dist", file)), {
        recursive: true,
      });
      await writeFile(
        path.join(root, "dist", file),
        file === "index.html" ? "<html>RepLens</html>" : "fixture",
      );
    }
    execFileSync(process.execPath, [path.join(root, "scripts/build-sw.mjs")]);
    const worker = await readFile(path.join(root, "dist/sw.js"), "utf8");
    const handlers = new Map();
    const saved = [];
    const deleted = [];
    const cacheNames = [];
    let networkCalls = 0;
    vm.runInNewContext(worker, {
      URL,
      Response,
      self: {
        location: { origin: "https://app.example.com" },
        addEventListener: (name, callback) => handlers.set(name, callback),
      },
      caches: {
        open: async (name) => {
          cacheNames.push(name);
          return { addAll: async (files) => saved.push(...files) };
        },
        match: async (request) =>
          new Response(
            request === "/index.html" ? "<html>RepLens</html>" : "cached asset",
          ),
        keys: async () => [
          cacheNames[0],
          "replens-shell-old",
          "unrelated-cache",
        ],
        delete: async (key) => {
          deleted.push(key);
          return true;
        },
      },
      fetch: async () => {
        networkCalls++;
        throw new Error("Offline");
      },
    });
    let task;
    handlers.get("install")({
      waitUntil: (promise) => {
        task = promise;
      },
    });
    await task;
    assert.ok(saved.includes("/assets/app.js"));
    assert.ok(saved.includes("/index.html"));
    assert.ok(saved.every((file) => !file.startsWith("/api/")));

    for (const url of [
      "/api/auth/get-session",
      "/api/sessions",
      "/private/consent.pdf",
      "/camera-frame.webm",
      "/models/rir.onnx",
      "https://other.example.com/assets/app.js",
    ]) {
      let intercepted = false;
      handlers.get("fetch")({
        request: {
          method: "GET",
          mode: "cors",
          url: new URL(url, "https://app.example.com").href,
        },
        respondWith: () => {
          intercepted = true;
        },
      });
      assert.equal(intercepted, false, `${url} must bypass the shell cache`);
    }
    let interceptedPost = false;
    handlers.get("fetch")({
      request: {
        method: "POST",
        mode: "cors",
        url: "https://app.example.com/index.html",
      },
      respondWith: () => {
        interceptedPost = true;
      },
    });
    assert.equal(interceptedPost, false);

    let response;
    handlers.get("fetch")({
      request: {
        method: "GET",
        mode: "navigate",
        url: "https://app.example.com/",
      },
      respondWith: (promise) => {
        response = promise;
      },
    });
    assert.equal(await (await response).text(), "<html>RepLens</html>");
    assert.equal(networkCalls, 1);

    handlers.get("activate")({
      waitUntil: (promise) => {
        task = promise;
      },
    });
    await task;
    assert.deepEqual(deleted, ["replens-shell-old"]);

    await writeFile(
      path.join(root, "dist/assets/app.js"),
      "new application build",
    );
    execFileSync(process.execPath, [path.join(root, "scripts/build-sw.mjs")]);
    assert.notEqual(
      await readFile(path.join(root, "dist/sw.js"), "utf8"),
      worker,
      "App changes must version the worker cache",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
