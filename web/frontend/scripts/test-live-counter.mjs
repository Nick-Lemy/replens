import assert from "node:assert/strict";
import test from "node:test";
import { TwoArmCurlCounter } from "../src/features/live/curlCounter.ts";

function arm(flexion, side) {
  const shoulderX = side === "left" ? 0.32 : 0.68;
  const direction = side === "left" ? 1 : -1;
  const radians = (flexion * Math.PI) / 180;
  return {
    shoulder: { x: shoulderX, y: 0.2, visibility: 1 },
    elbow: { x: shoulderX, y: 0.45, visibility: 1 },
    wrist: {
      x: shoulderX + direction * 0.25 * Math.sin(radians),
      y: 0.45 + 0.25 * Math.cos(radians),
      visibility: 1,
    },
  };
}

function worldArm(flexion, side) {
  const shoulderX = side === "left" ? 0 : 2;
  const direction = side === "left" ? 1 : -1;
  const radians = (flexion * Math.PI) / 180;
  return {
    shoulder: { x: shoulderX, y: 0, z: 0, visibility: 1 },
    elbow: { x: shoulderX, y: 1, z: 0, visibility: 1 },
    wrist: {
      x: shoulderX + direction * Math.sin(radians),
      y: 1 + Math.cos(radians),
      z: 0,
      visibility: 1,
    },
  };
}

function frame(timestamp, leftAngle = 20, rightAngle = leftAngle) {
  return {
    timestamp,
    width: 640,
    height: 480,
    left: arm(leftAngle, "left"),
    right: arm(rightAngle, "right"),
    worldLeft: worldArm(leftAngle, "left"),
    worldRight: worldArm(rightAngle, "right"),
  };
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function curlAngle(elapsed, { lift = 2, hold = 0.7, lower = 2 } = {}) {
  if (elapsed < lift) return 20 + 100 * smoothstep(elapsed / lift);
  if (elapsed < lift + hold) return 120;
  const down = elapsed - lift - hold;
  if (down < lower) return 120 - 100 * smoothstep(down / lower);
  return 20;
}

function countAtFps(fps, reps = 1, options = {}) {
  const counter = new TwoArmCurlCounter();
  const step = 1000 / fps;
  const previewEnd = 1_000;
  for (let timestamp = 0; timestamp <= previewEnd; timestamp += step) {
    counter.update(frame(timestamp), false);
  }
  counter.beginSet(previewEnd);
  const between = options.rest ?? 0.7;
  const cycle = (options.lift ?? 2) + (options.hold ?? 0.7) + (options.lower ?? 2) + between;
  const end = previewEnd + (options.duration ?? reps * cycle * 1000 + 500);
  for (let timestamp = previewEnd + step; timestamp <= end; timestamp += step) {
    const elapsedFromSet = (timestamp - previewEnd) / 1000;
    const cycleIndex = Math.floor((timestamp - previewEnd) / (cycle * 1000));
    const within = elapsedFromSet - (cycleIndex * cycle);
    const angle = within < cycle - between
      ? curlAngle(within, options)
      : 20;
    counter.update(frame(timestamp, angle), true);
  }
  return counter;
}

test("counts complete slow two arm curls at 5, 10, and 30 frames per second", () => {
  for (const fps of [5, 10, 30]) {
    assert.equal(countAtFps(fps, 3).count, 3, `${fps} fps`);
  }
});

test("preview calibration allows an immediate first rep after the set starts", () => {
  const counter = new TwoArmCurlCounter();
  for (let timestamp = 0; timestamp <= 1_000; timestamp += 100) {
    counter.update(frame(timestamp), false);
  }
  counter.beginSet(1_000);
  for (let timestamp = 1_100; timestamp <= 7_000; timestamp += 100) {
    counter.update(frame(timestamp, curlAngle((timestamp - 1_000) / 1000)), true);
  }
  assert.equal(counter.count, 1);
});

test("starting during a preview curl discards that partial curl", () => {
  const counter = new TwoArmCurlCounter();
  for (let timestamp = 0; timestamp <= 1_000; timestamp += 100) {
    counter.update(frame(timestamp), false);
  }
  for (let timestamp = 1_100; timestamp <= 2_300; timestamp += 100) {
    counter.update(frame(timestamp, curlAngle((timestamp - 1_000) / 1000)), false);
  }
  counter.beginSet(2_300);
  for (let timestamp = 2_400; timestamp <= 14_000; timestamp += 100) {
    const elapsed = (timestamp - 2_300) / 1000;
    const angle = elapsed < 1.2 ? Math.max(20, 120 - 100 * smoothstep(elapsed / 1.2))
      : elapsed < 1.8 ? 20
        : curlAngle(elapsed - 1.8);
    counter.update(frame(timestamp, angle), true);
  }
  assert.equal(counter.count, 1);
});

test("one arm, alternating arms, and partial curls do not count", () => {
  const assertNoCount = (angleAt) => {
    const counter = new TwoArmCurlCounter();
    for (let timestamp = 0; timestamp <= 1_000; timestamp += 100) counter.update(frame(timestamp), false);
    counter.beginSet(1_000);
    for (let timestamp = 1_100; timestamp <= 15_000; timestamp += 100) {
      const [leftAngle, rightAngle] = angleAt((timestamp - 1_000) / 1000);
      counter.update(frame(timestamp, leftAngle, rightAngle), true);
    }
    assert.equal(counter.count, 0);
  };
  assertNoCount((time) => [curlAngle(time % 5.5), 20]);
  assertNoCount((time) => Math.floor(time / 5.5) % 2 === 0
    ? [curlAngle(time % 5.5), 20]
    : [20, curlAngle(time % 5.5)]);
  assertNoCount((time) => {
    const phase = time % 5.5;
    const partial = phase < 2 ? 20 + 40 * smoothstep(phase / 2)
      : phase < 2.7 ? 60
        : phase < 4.7 ? 60 - 40 * smoothstep((phase - 2.7) / 2)
          : 20;
    return [partial, partial];
  });
});

test("separate alternating top holds never satisfy simultaneous bilateral top", () => {
  const counter = new TwoArmCurlCounter();
  for (let timestamp = 0; timestamp <= 1_000; timestamp += 100) {
    counter.update(frame(timestamp), false);
  }
  counter.beginSet(1_000);
  const sequence = [
    [130, 20], [70, 20], [70, 130], [70, 70], [130, 70], [70, 20], [20, 20],
  ];
  let timestamp = 1_100;
  for (const [left, right] of sequence) {
    for (let step = 0; step < 10; step += 1) {
      counter.update(frame(timestamp, left, right), true);
      timestamp += 100;
    }
  }
  assert.equal(counter.count, 0);
});

test("brief pose loss preserves a rep while a long frame gap safely resets it", () => {
  const run = (gap) => {
    const counter = new TwoArmCurlCounter();
    for (let timestamp = 0; timestamp <= 1_000; timestamp += 100) counter.update(frame(timestamp), false);
    counter.beginSet(1_000);
    let last = 1_000;
    for (let timestamp = 1_100; timestamp <= 7_000; timestamp += 100) {
      const angle = curlAngle((timestamp - 1_000) / 1000);
      if (timestamp >= 2_800 && timestamp < 2_800 + gap) {
        counter.update({ ...frame(timestamp), left: null }, true);
      } else {
        counter.update(frame(timestamp, angle), true);
      }
      last = timestamp;
    }
    return { counter, last };
  };
  assert.equal(run(200).counter.count, 1);
  assert.equal(run(1_200).counter.count, 0);
});

test("completed rep counts once during a bottom hold and reset clears it", () => {
  const counter = countAtFps(10, 1);
  assert.equal(counter.count, 1);
  counter.reset();
  assert.equal(counter.count, 0);
});

test("non-finite world points are rejected while later valid frames can recover", () => {
  const counter = new TwoArmCurlCounter();
  for (let timestamp = 0; timestamp <= 1_000; timestamp += 100) counter.update(frame(timestamp), false);
  counter.beginSet(1_000);
  for (let timestamp = 1_100; timestamp <= 8_000; timestamp += 100) {
    const current = frame(timestamp, curlAngle((timestamp - 1_000) / 1000));
    if (timestamp === 3_000) current.worldRight.wrist.x = Number.NaN;
    const result = counter.update(current, true);
    if (timestamp === 3_000) assert.equal(result.status, "both-arms");
  }
  assert.equal(counter.count, 1);
});
