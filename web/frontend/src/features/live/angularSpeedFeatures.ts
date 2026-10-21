export interface AngularSample {
  timestampMs: number;
  leftFlexionDeg: number;
  rightFlexionDeg: number;
}

export interface AngularSpeedFeatures {
  startTimestampMs: number;
  topTimestampMs: number;
  rangeDegrees: number;
  meanUpSpeedDegS: number;
  peakUpSpeedDegS: number;
}

/** Extract speed-only demo inputs from measured, smoothed bilateral angles. */
export function extractAngularSpeedFeatures(samples: readonly AngularSample[]): AngularSpeedFeatures | null {
  if (samples.length < 2) return null;
  if (samples.some((sample, index) =>
    !Number.isFinite(sample.timestampMs) ||
    !Number.isFinite(sample.leftFlexionDeg) ||
    !Number.isFinite(sample.rightFlexionDeg) ||
    (index > 0 && sample.timestampMs <= samples[index - 1].timestampMs),
  )) return null;

  const meanAngle = (sample: AngularSample) => (sample.leftFlexionDeg + sample.rightFlexionDeg) / 2;
  let topIndex = 0;
  for (let index = 1; index < samples.length; index += 1) {
    if (meanAngle(samples[index]) > meanAngle(samples[topIndex])) topIndex = index;
  }
  if (topIndex < 1) return null;

  const start = samples[0];
  const top = samples[topIndex];
  const durationSeconds = (top.timestampMs - start.timestampMs) / 1_000;
  const rangeDegrees = meanAngle(top) - meanAngle(start);
  if (!(durationSeconds > 0) || !(rangeDegrees > 0)) return null;

  let peakUpSpeedDegS = 0;
  for (let index = 1; index <= topIndex; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const duration = (current.timestampMs - previous.timestampMs) / 1_000;
    const speed = (meanAngle(current) - meanAngle(previous)) / duration;
    if (speed > peakUpSpeedDegS) peakUpSpeedDegS = speed;
  }

  const meanUpSpeedDegS = rangeDegrees / durationSeconds;
  if (![meanUpSpeedDegS, peakUpSpeedDegS].every(Number.isFinite) || peakUpSpeedDegS <= 0) return null;
  return {
    startTimestampMs: start.timestampMs,
    topTimestampMs: top.timestampMs,
    rangeDegrees,
    meanUpSpeedDegS,
    peakUpSpeedDegS,
  };
}
