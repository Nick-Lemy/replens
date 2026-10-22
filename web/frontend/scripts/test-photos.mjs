import assert from "node:assert/strict";
import { test } from "node:test";
import { exercises } from "../../backend/src/exercises/catalog/exercises.ts";
import { exercisePhotos } from "../../backend/src/exercises/catalog/exercise-photos.ts";

test("every guide has public photo sources and licensing metadata", () => {
  assert.equal(
    new Set(exercises.map((exercise) => exercise.id)).size,
    exercises.length,
  );
  for (const exercise of exercises) {
    const photos = exercisePhotos[exercise.id];
    assert.ok(photos, `Missing photo set for ${exercise.id}`);
    assert.ok(photos.images.length > 0, `Empty photo set for ${exercise.id}`);
    for (const image of photos.images) {
      const url = new URL(image);
      assert.equal(url.protocol, "https:");
      assert.ok(
        (url.hostname === "raw.githubusercontent.com" &&
          url.pathname.startsWith(
            "/yuhonas/free-exercise-db/main/exercises/",
          )) ||
          (url.hostname === "images.pexels.com" &&
            /^\/photos\/\d+\/pexels-photo-\d+\.jpeg$/.test(url.pathname)) ||
          (url.hostname === "commons.wikimedia.org" &&
            url.pathname.startsWith("/wiki/Special:FilePath/")),
        `Unexpected photo provider for ${exercise.id}`,
      );
      assert.equal(url.username, "");
      assert.equal(url.password, "");
    }
    for (const field of ["sourceUrl", "creditUrl", "licenseUrl"]) {
      assert.equal(new URL(photos[field]).protocol, "https:");
    }
    assert.ok(photos.credit);
    assert.ok(photos.license);
  }
  assert.equal(exercisePhotos["bird-dog"].credit, "PTPioneer");
  assert.equal(exercisePhotos["bird-dog"].license, "CC BY 2.0");
});
