export interface PoseLandmark {
  x: number;
  y: number;
  visibility: number;
}

export interface ArmLandmarks {
  shoulder: PoseLandmark;
  elbow: PoseLandmark;
  wrist: PoseLandmark;
}

export interface WorldLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface WorldArmLandmarks {
  shoulder: WorldLandmark;
  elbow: WorldLandmark;
  wrist: WorldLandmark;
}

export interface PoseFrame {
  timestamp: number;
  width: number;
  height: number;
  left: ArmLandmarks | null;
  right: ArmLandmarks | null;
  worldLeft: WorldArmLandmarks | null;
  worldRight: WorldArmLandmarks | null;
}

export type TrackingStatus =
  | "waiting"
  | "both-arms"
  | "start-position"
  | "steady"
  | "tracking"
  | "return-bottom";

export interface CounterResult {
  count: number;
  status: TrackingStatus;
  left: ArmLandmarks | null;
  right: ArmLandmarks | null;
}

interface Sample {
  timestamp: number;
  width: number;
  height: number;
  angles: [number, number];
  arms: [ArmLandmarks, ArmLandmarks];
}

type Phase = "waiting-bottom" | "bottom" | "curl";

const MIN_VISIBILITY = 0.6;
const MIN_BEND_DEGREES = 45;
const MIN_TOP_FLEXION_DEGREES = 90;
const MAX_CYCLE_MS = 20_000;
const MAX_SAMPLE_GAP_MS = 550;
const MAX_JUMP_DEGREES = 45;

function pixelPoint(point: PoseLandmark, width: number, height: number): [number, number] {
  return [point.x * width, point.y * height];
}

function distance(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function flexion(arm: WorldArmLandmarks): number {
  const a = [
    arm.shoulder.x - arm.elbow.x,
    arm.shoulder.y - arm.elbow.y,
    arm.shoulder.z - arm.elbow.z,
  ];
  const b = [
    arm.wrist.x - arm.elbow.x,
    arm.wrist.y - arm.elbow.y,
    arm.wrist.z - arm.elbow.z,
  ];
  const denominator = Math.hypot(...a) * Math.hypot(...b);
  if (denominator < 0.001) return Number.NaN;
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const cosine = Math.max(-1, Math.min(1, dot / denominator));
  return 180 - (Math.acos(cosine) * 180) / Math.PI;
}

function visible(arm: ArmLandmarks | null): arm is ArmLandmarks {
  return !!arm && [arm.shoulder, arm.elbow, arm.wrist].every((point) =>
    Number.isFinite(point.x) && point.x >= 0 && point.x <= 1 &&
    Number.isFinite(point.y) && point.y >= 0 && point.y <= 1 &&
    point.visibility >= MIN_VISIBILITY,
  );
}

export class TwoArmCurlCounter {
  private count = 0;
  private phase: Phase = "waiting-bottom";
  private previous: Sample | null = null;
  private lastAcceptedTimestamp = 0;
  private smoothed: [number, number] | null = null;
  private bottom: [number, number] | null = null;
  private bottomStart = 0;
  private bottomTotals: [number, number] = [0, 0];
  private bottomSamples = 0;
  private bottomPreviousAngles: [number, number] | null = null;
  private candidateStart = 0;
  private crossingTimes: [number | null, number | null] = [null, null];
  private peaks: [number, number] = [-Infinity, -Infinity];
  private peakTimes: [number, number] = [0, 0];
  private peakArms: [ArmLandmarks | null, ArmLandmarks | null] = [null, null];
  private startArms: [ArmLandmarks, ArmLandmarks] | null = null;

  reset(): void {
    this.count = 0;
    this.clearTracking();
  }

  private clearTracking(): void {
    this.phase = "waiting-bottom";
    this.previous = null;
    this.lastAcceptedTimestamp = 0;
    this.smoothed = null;
    this.bottom = null;
    this.bottomStart = 0;
    this.bottomTotals = [0, 0];
    this.bottomSamples = 0;
    this.bottomPreviousAngles = null;
    this.clearCandidate();
  }

  private clearCandidate(requireBottom = false): void {
    if (requireBottom) {
      this.bottom = null;
      this.bottomStart = 0;
      this.bottomTotals = [0, 0];
      this.bottomSamples = 0;
      this.bottomPreviousAngles = null;
    }
    this.phase = this.bottom ? "bottom" : "waiting-bottom";
    this.candidateStart = 0;
    this.crossingTimes = [null, null];
    this.peaks = [-Infinity, -Infinity];
    this.peakTimes = [0, 0];
    this.peakArms = [null, null];
    this.startArms = null;
  }

  private result(status: TrackingStatus, left: ArmLandmarks | null, right: ArmLandmarks | null): CounterResult {
    return { count: this.count, status, left, right };
  }

  update(frame: PoseFrame, allowCount = true): CounterResult {
    const { left, right } = frame;
    if (!visible(left) || !visible(right)) {
      this.clearTracking();
      return this.result("both-arms", left, right);
    }

    if (!frame.worldLeft || !frame.worldRight) {
      this.clearTracking();
      return this.result("both-arms", left, right);
    }
    const angles: [number, number] = [
      flexion(frame.worldLeft),
      flexion(frame.worldRight),
    ];
    if (!angles.every(Number.isFinite)) {
      this.clearTracking();
      return this.result("both-arms", left, right);
    }

    const current: Sample = {
      timestamp: frame.timestamp,
      width: frame.width,
      height: frame.height,
      angles,
      arms: [left, right],
    };
    if (
      this.lastAcceptedTimestamp > 0 &&
      current.timestamp - this.lastAcceptedTimestamp > MAX_SAMPLE_GAP_MS
    ) {
      this.clearTracking();
    }
    if (this.previous) {
      const gap = current.timestamp - this.previous.timestamp;
      const jump = current.angles.some((angle, index) =>
        Math.abs(angle - this.previous!.angles[index]) > MAX_JUMP_DEGREES,
      );
      if (gap <= 0 || gap > MAX_SAMPLE_GAP_MS) {
        this.clearTracking();
      }
      if (gap < 150 && jump) {
        this.previous = current;
        return this.result("steady", left, right);
      }
    }

    this.previous = current;
    this.lastAcceptedTimestamp = current.timestamp;
    this.smoothed = this.smoothed
      ? [
          this.smoothed[0] * 0.55 + angles[0] * 0.45,
          this.smoothed[1] * 0.55 + angles[1] * 0.45,
        ]
      : angles;

    if (!this.bottom || this.phase === "waiting-bottom") {
      return this.observeBottom(current);
    }
    if (this.phase === "bottom") {
      return this.observeLift(current);
    }
    return this.observeCurl(current, allowCount);
  }

  private observeBottom(sample: Sample): CounterResult {
    const angles = this.smoothed ?? sample.angles;
    const isExtended = angles[0] <= 55 && angles[1] <= 55;
    if (!isExtended) {
      this.resetBottomObservation();
      return this.result("start-position", sample.arms[0], sample.arms[1]);
    }
    if (this.bottomPreviousAngles && angles.some((angle, index) =>
      Math.abs(angle - this.bottomPreviousAngles![index]) > 10,
    )) this.resetBottomObservation();
    if (!this.bottomStart) this.bottomStart = sample.timestamp;
    this.bottomTotals[0] += angles[0];
    this.bottomTotals[1] += angles[1];
    this.bottomSamples += 1;
    this.bottomPreviousAngles = [...angles];
    if (sample.timestamp - this.bottomStart >= 450 && this.bottomSamples >= 3) {
      this.bottom = [
        this.bottomTotals[0] / this.bottomSamples,
        this.bottomTotals[1] / this.bottomSamples,
      ];
      this.phase = "bottom";
      return this.result("tracking", sample.arms[0], sample.arms[1]);
    }
    return this.result("start-position", sample.arms[0], sample.arms[1]);
  }

  private resetBottomObservation(): void {
    this.bottomStart = 0;
    this.bottomTotals = [0, 0];
    this.bottomSamples = 0;
    this.bottomPreviousAngles = null;
  }

  private observeLift(sample: Sample): CounterResult {
    const angles = this.smoothed ?? sample.angles;
    const bottom = this.bottom!;
    const liftThresholds = [bottom[0] + 12, bottom[1] + 12];
    for (const index of [0, 1] as const) {
      if (this.crossingTimes[index] === null && angles[index] >= liftThresholds[index]) {
        this.crossingTimes[index] = sample.timestamp;
      }
    }
    if (this.crossingTimes[0] === null && this.crossingTimes[1] === null) {
      return this.result("tracking", sample.arms[0], sample.arms[1]);
    }

    if ([0, 1].some((index) => this.crossingTimes[index] !== null && angles[index] < bottom[index] + 8)) {
      this.clearCandidate(true);
      return this.result("start-position", sample.arms[0], sample.arms[1]);
    }

    const firstCrossing = Math.min(...this.crossingTimes.filter((value): value is number => value !== null));
    if (sample.timestamp - firstCrossing > 500 && (this.crossingTimes[0] === null || this.crossingTimes[1] === null)) {
      this.clearCandidate(true);
      return this.result("return-bottom", sample.arms[0], sample.arms[1]);
    }
    if (angles[0] >= bottom[0] + MIN_BEND_DEGREES && angles[1] >= bottom[1] + MIN_BEND_DEGREES) {
      const leftCrossing = this.crossingTimes[0];
      const rightCrossing = this.crossingTimes[1];
      if (leftCrossing === null || rightCrossing === null || Math.abs(leftCrossing - rightCrossing) > 500) {
        this.clearCandidate(true);
        return this.result("return-bottom", sample.arms[0], sample.arms[1]);
      }
      this.phase = "curl";
      this.candidateStart = Math.min(leftCrossing, rightCrossing);
      this.startArms = sample.arms;
      this.peaks = [...angles];
      this.peakTimes = [sample.timestamp, sample.timestamp];
      this.peakArms = [...sample.arms];
    }
    return this.result(this.phase === "curl" ? "tracking" : "return-bottom", sample.arms[0], sample.arms[1]);
  }

  private observeCurl(sample: Sample, allowCount: boolean): CounterResult {
    const angles = this.smoothed ?? sample.angles;
    if (sample.timestamp - this.candidateStart > MAX_CYCLE_MS) {
      this.clearCandidate(true);
      return this.result("return-bottom", sample.arms[0], sample.arms[1]);
    }

    for (const index of [0, 1] as const) {
      if (angles[index] > this.peaks[index]) {
        this.peaks[index] = angles[index];
        this.peakTimes[index] = sample.timestamp;
        this.peakArms[index] = sample.arms[index];
      }
    }

    const bottom = this.bottom!;
    const returned = angles[0] <= bottom[0] + 15 && angles[1] <= bottom[1] + 15;
    if (!returned) return this.result("tracking", sample.arms[0], sample.arms[1]);

    const startArms = this.startArms!;
    const peaks = this.peakArms;
    const bothPeaks = !!peaks[0] && !!peaks[1];
    const syncPeaks = bothPeaks && Math.abs(this.peakTimes[0] - this.peakTimes[1]) <= 500;
    const enoughBend = this.peaks[0] - bottom[0] >= MIN_BEND_DEGREES &&
      this.peaks[1] - bottom[1] >= MIN_BEND_DEGREES &&
      this.peaks[0] >= MIN_TOP_FLEXION_DEGREES &&
      this.peaks[1] >= MIN_TOP_FLEXION_DEGREES;
    const enoughTime = this.peakTimes[0] - this.candidateStart >= 350 &&
      this.peakTimes[1] - this.candidateStart >= 350 &&
      sample.timestamp - Math.max(...this.peakTimes) >= 350;
    const plausibility = bothPeaks ? [0, 1].map((index) => {
      const start = startArms[index];
      const peak = peaks[index]!;
      const shoulderStart = pixelPoint(start.shoulder, sample.width, sample.height);
      const elbowStart = pixelPoint(start.elbow, sample.width, sample.height);
      const wristStart = pixelPoint(start.wrist, sample.width, sample.height);
      const elbowPeak = pixelPoint(peak.elbow, sample.width, sample.height);
      const wristPeak = pixelPoint(peak.wrist, sample.width, sample.height);
      const armLength = distance(shoulderStart, elbowStart);
      const startUpperArm = [
        elbowStart[0] - shoulderStart[0],
        elbowStart[1] - shoulderStart[1],
      ] as [number, number];
      const peakShoulder = pixelPoint(peak.shoulder, sample.width, sample.height);
      const peakUpperArm = [
        elbowPeak[0] - peakShoulder[0],
        elbowPeak[1] - peakShoulder[1],
      ] as [number, number];
      const startForearmHeight = wristStart[1] - elbowStart[1];
      const peakForearmHeight = wristPeak[1] - elbowPeak[1];
      const wristRise = startForearmHeight - peakForearmHeight;
      const elbowShift = distance(startUpperArm, peakUpperArm);
      return { armLength, wristRise, elbowShift };
    }) : [];
    const plausibleCurl = bothPeaks && plausibility.every(({ armLength, wristRise, elbowShift }) =>
      armLength > 1 && wristRise >= 0.25 * armLength && elbowShift <= 0.5 * armLength,
    );

    const completedCurl = syncPeaks && enoughBend && enoughTime && plausibleCurl;
    if (allowCount && completedCurl) this.count += 1;
    this.clearCandidate(!completedCurl);
    return this.result(completedCurl ? "tracking" : "start-position", sample.arms[0], sample.arms[1]);
  }
}
