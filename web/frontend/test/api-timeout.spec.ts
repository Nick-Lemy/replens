import { expect, test } from "@playwright/test";
import { currentUser } from "../src/features/auth/api";

test("session read timeout includes a stalled body after successful headers", async () => {
  const original = globalThis.fetch;
  let aborted = false;
  globalThis.fetch = async (_input, init) => new Response(new ReadableStream({
    start(stream) {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
        stream.error(new DOMException("Request timed out", "AbortError"));
      });
    },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    await expect(currentUser(20)).rejects.toThrow("Cannot reach account services");
    expect(aborted).toBe(true);
  } finally {
    globalThis.fetch = original;
  }
});
