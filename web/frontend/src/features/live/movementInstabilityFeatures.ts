import type { AngularSample } from "./angularSpeedFeatures";

export interface MovementSample extends AngularSample {
  leftWristRelativeX: number;
  leftWristRelativeY: number;
  rightWristRelativeX: number;
  rightWristRelativeY: number;
  shoulderWidth: number;
}

interface Point2D { x: number; y: number }

function median(values: readonly number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function solve3(matrix: number[][], rhs: number[]): [number, number, number] | null {
  const rows = matrix.map((row, index) => [...row, rhs[index]]);
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    if (Math.abs(rows[pivot][column]) < 1e-12) return null;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let index = column; index < 4; index += 1) rows[column][index] /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let index = column; index < 4; index += 1) rows[row][index] -= factor * rows[column][index];
    }
  }
  return [rows[0][3], rows[1][3], rows[2][3]];
}

/** scipy.signal.savgol_filter(..., polyorder=2, mode="interp") on uniform samples. */
function quadraticResiduals(values: readonly number[], window: number): number[] | null {
  const half = Math.floor(window / 2);
  if (values.length < window) return null;
  const residuals: number[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const start = index < half ? 0 : index >= values.length - half ? values.length - window : index - half;
    const isEdge = index < half || index >= values.length - half;
    let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
    let t0 = 0, t1 = 0, t2 = 0;
    for (let offset = 0; offset < window; offset += 1) {
      const x = isEdge ? offset : offset - half;
      const y = values[start + offset];
      const x2 = x * x;
      s0 += 1; s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2;
      t0 += y; t1 += x * y; t2 += x2 * y;
    }
    const coefficients = solve3(
      [[s0, s1, s2], [s1, s2, s3], [s2, s3, s4]],
      [t0, t1, t2],
    );
    if (!coefficients) return null;
    const x = isEdge ? index - start : 0;
    const trend = coefficients[0] + coefficients[1] * x + coefficients[2] * x * x;
    residuals.push(values[index] - trend);
  }
  return residuals;
}

/** Computes a pilot-style wrist residual RMS after timestamp-based uniform resampling. */
export function extractMovementInstability(
  samples: readonly MovementSample[],
  topTimestampMs: number,
): number | null {
  const topIndex = samples.findIndex((sample) => sample.timestampMs === topTimestampMs);
  if (topIndex < 1) return null;
  const lift = samples.slice(0, topIndex + 1);
  if (lift.length < 7 || lift.some((sample) =>
    ![
      sample.timestampMs, sample.leftWristRelativeX, sample.leftWristRelativeY,
      sample.rightWristRelativeX, sample.rightWristRelativeY, sample.shoulderWidth,
    ].every(Number.isFinite) || sample.shoulderWidth <= 0,
  )) return null;
  const widths = lift.map((sample) => sample.shoulderWidth);
  if (median(widths) < 0.03) return null;
  const deltas = lift.slice(1).map((sample, index) => sample.timestampMs - lift[index].timestampMs);
  if (deltas.some((delta) => delta <= 0)) return null;
  const medianDelta = median(deltas);
  if (medianDelta > 250) return null;
  if (deltas.some((delta) => delta > Math.max(250, medianDelta * 1.75))) return null;

  const channels = [
    lift.map((sample) => sample.leftWristRelativeX / sample.shoulderWidth),
    lift.map((sample) => sample.leftWristRelativeY / sample.shoulderWidth),
    lift.map((sample) => sample.rightWristRelativeX / sample.shoulderWidth),
    lift.map((sample) => sample.rightWristRelativeY / sample.shoulderWidth),
  ];
  const start = lift[0].timestampMs;
  const end = lift[lift.length - 1].timestampMs;
  const sampleRate = 1_000 / medianDelta;
  const window = Math.max(7, Math.round(0.4 * sampleRate) | 1);
  if (lift.length < window) return null;
  const uniformCount = Math.max(window, Math.round((end - start) / medianDelta) + 1);
  if (uniformCount > 500) return null;
  const uniformTimes = Array.from({ length: uniformCount }, (_, index) => start + (end - start) * index / (uniformCount - 1));
  const residuals: number[][] = [];
  for (const channel of channels) {
    const normalizedSamples = lift.map((sample, index) => ({ ...sample, normalized: channel[index] }));
    const sampled = uniformTimes.map((time) => {
      if (time <= normalizedSamples[0].timestampMs) return normalizedSamples[0].normalized;
      if (time >= normalizedSamples[normalizedSamples.length - 1].timestampMs) return normalizedSamples[normalizedSamples.length - 1].normalized;
      const right = normalizedSamples.findIndex((sample) => sample.timestampMs >= time);
      const before = normalizedSamples[right - 1];
      const after = normalizedSamples[right];
      const fraction = (time - before.timestampMs) / (after.timestampMs - before.timestampMs);
      return before.normalized + fraction * (after.normalized - before.normalized);
    });
    const values = quadraticResiduals(sampled, window);
    if (!values) return null;
    residuals.push(values);
  }
  const sumSquares = residuals.flat().reduce((sum, value) => sum + value * value, 0);
  const result = Math.sqrt(sumSquares / (uniformCount * 4));
  return Number.isFinite(result) ? result : null;
}

export function captureWristMovementSample(
  leftShoulder: Point2D,
  leftWrist: Point2D,
  rightShoulder: Point2D,
  rightWrist: Point2D,
): Omit<MovementSample, "timestampMs" | "leftFlexionDeg" | "rightFlexionDeg"> {
  return {
    leftWristRelativeX: leftWrist.x - leftShoulder.x,
    leftWristRelativeY: leftWrist.y - leftShoulder.y,
    rightWristRelativeX: rightWrist.x - rightShoulder.x,
    rightWristRelativeY: rightWrist.y - rightShoulder.y,
    shoulderWidth: Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y),
  };
}
