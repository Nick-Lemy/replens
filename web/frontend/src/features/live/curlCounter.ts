import type { AngularSample } from "./angularSpeedFeatures";

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
  angles: [number, number] | null;
  reason: string | null;
  readyToStart: boolean;
  completedRep: CompletedRepSamples | null;
}

export interface CompletedRepSamples {
  endTimestampMs: number;
  samples: AngularSample[];
}

interface Sample {
  timestamp: number;
  width: number;
  height: number;
  angles: [number, number];
  arms: [ArmLandmarks, ArmLandmarks];
  smoothedAngles?: [number, number];
}

type Phase = "waiting-bottom" | "bottom" | "curl" | "rearming";

const MIN_VISIBILITY = 0.6;
const MIN_BEND_DEGREES = 45;
const MIN_TOP_FLEXION_DEGREES = 90;
const MAX_CYCLE_MS = 20_000;
const MAX_SAMPLE_GAP_MS = 1_000;
const MAX_JUMP_DEGREES = 45;
const SMOOTHING_TIME_CONSTANT_MS = 220;
const MAX_POSE_LOSS_GRACE_MS = 250;

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
  private lostAt: number | null = null;
  private bottom: [number, number] | null = null;
  private bottomArms: [ArmLandmarks, ArmLandmarks] | null = null;
  private bottomStart = 0;
  private bottomTotals: [number, number] = [0, 0];
  private bottomSamples = 0;
  private bottomPreviousAngles: [number, number] | null = null;
  private candidateStart = 0;
  private crossingTimes: [number | null, number | null] = [null, null];
  private observedBothAtTop = false;
  private peaks: [number, number] = [-Infinity, -Infinity];
  private peakTimes: [number, number] = [0, 0];
  private peakArms: [ArmLandmarks | null, ArmLandmarks | null] = [null, null];
  private startArms: [ArmLandmarks, ArmLandmarks] | null = null;
  private rearmStart = 0;
  private rearmTotals: [number, number] = [0, 0];
  private rearmSamples = 0;
  private lastRejection: string | null = null;
  private candidateSamples: AngularSample[] = [];
  private candidateSamplesUsable = true;

  reset(): void {
    this.count = 0;
    this.clearTracking();
    this.lastRejection = null;
  }

  beginSet(timestamp: number): void {
    const retainBottom = this.bottom !== null && this.phase === "bottom" &&
      this.lastAcceptedTimestamp > 0 && timestamp - this.lastAcceptedTimestamp <= MAX_SAMPLE_GAP_MS &&
      this.smoothed !== null && this.smoothed.every((angle, index) => angle <= this.bottom![index] + 12);
    this.count = 0;
    this.clearCandidate(!retainBottom);
    this.previous = null;
    this.lastAcceptedTimestamp = 0;
    this.smoothed = null;
    this.lostAt = null;
    this.lastRejection = null;
    if (retainBottom) {
      this.phase = "bottom";
    } else {
      this.clearTracking();
    }
  }

  private clearTracking(): void {
    this.phase = "waiting-bottom";
    this.previous = null;
    this.lastAcceptedTimestamp = 0;
    this.smoothed = null;
    this.bottom = null;
    this.bottomArms = null;
    this.bottomStart = 0;
    this.bottomTotals = [0, 0];
    this.bottomSamples = 0;
    this.bottomPreviousAngles = null;
    this.clearCandidate();
  }

  private clearCandidate(requireBottom = false): void {
    if (requireBottom) {
      this.bottom = null;
      this.bottomArms = null;
      this.bottomStart = 0;
      this.bottomTotals = [0, 0];
      this.bottomSamples = 0;
      this.bottomPreviousAngles = null;
    }
    this.phase = this.bottom ? "bottom" : "waiting-bottom";
    this.candidateStart = 0;
    this.crossingTimes = [null, null];
    this.observedBothAtTop = false;
    this.peaks = [-Infinity, -Infinity];
    this.peakTimes = [0, 0];
    this.peakArms = [null, null];
    this.startArms = null;
    this.candidateSamples = [];
    this.candidateSamplesUsable = true;
  }

  private result(status: TrackingStatus, left: ArmLandmarks | null, right: ArmLandmarks | null, completedRep: CompletedRepSamples | null = null): CounterResult {
    return {
      count: this.count,
      status,
      left,
      right,
      angles: this.smoothed ? [...this.smoothed] : null,
      reason: this.lastRejection,
      readyToStart: this.phase === "bottom" && this.bottom !== null && this.smoothed !== null &&
        this.smoothed.every((angle, index) => angle <= this.bottom![index] + 12),
      completedRep,
    };
  }

  private registerPoseLoss(timestamp: number): void {
    this.lostAt ??= timestamp;
    const lostFor = timestamp - this.lostAt;
    if (lostFor > MAX_POSE_LOSS_GRACE_MS) {
      this.clearCandidate(true);
      this.lastRejection = "Pose tracking paused. Hold both arms in view and return to the start.";
    }
    if (lostFor > MAX_SAMPLE_GAP_MS) {
      this.clearTracking();
      this.lostAt = timestamp;
      this.lastRejection = "Tracking was lost for too long. Recalibrate with both arms extended.";
    }
  }

  update(frame: PoseFrame, allowCount = true): CounterResult {
    const { left, right } = frame;
    if (!visible(left) || !visible(right)) {
      this.registerPoseLoss(frame.timestamp);
      return this.result("both-arms", left, right);
    }

    if (!frame.worldLeft || !frame.worldRight) {
      this.registerPoseLoss(frame.timestamp);
      return this.result("both-arms", left, right);
    }
    if (this.lostAt !== null) {
      const lostFor = frame.timestamp - this.lostAt;
      if (lostFor > MAX_POSE_LOSS_GRACE_MS) {
        this.clearCandidate(true);
        this.lastRejection = lostFor > MAX_SAMPLE_GAP_MS
          ? "Tracking was lost for too long. Recalibrate with both arms extended."
          : "Pose tracking paused. Hold both arms in view and return to the start.";
      }
      if (lostFor > MAX_SAMPLE_GAP_MS) this.clearTracking();
      this.lostAt = null;
    }
    const angles: [number, number] = [
      flexion(frame.worldLeft),
      flexion(frame.worldRight),
    ];
    if (!angles.every(Number.isFinite)) {
      this.registerPoseLoss(frame.timestamp);
      return this.result("both-arms", left, right);
    }

    const current: Sample = {
      timestamp: frame.timestamp,
      width: frame.width,
      height: frame.height,
      angles,
      arms: [left, right],
    };
    const sampleGap = this.previous ? current.timestamp - this.previous.timestamp : 0;
    if (sampleGap > MAX_SAMPLE_GAP_MS) {
      this.clearTracking();
      this.lastRejection = "Tracking was interrupted. Recalibrate with both arms extended.";
    }
    if (this.previous) {
      const gap = current.timestamp - this.previous.timestamp;
      const jump = current.angles.some((angle, index) =>
        Math.abs(angle - this.previous!.angles[index]) > MAX_JUMP_DEGREES,
      );
      if (gap <= 0) {
        this.clearTracking();
        this.lastRejection = "Camera timestamps changed. Restart tracking before continuing.";
      }
      if (gap < 150 && jump) {
        this.previous = current;
        return this.result("steady", left, right);
      }
    }

    this.previous = current;
    this.lastAcceptedTimestamp = current.timestamp;
    const alpha = this.smoothed && sampleGap > 0
      ? 1 - Math.exp(-sampleGap / SMOOTHING_TIME_CONSTANT_MS)
      : 1;
    this.smoothed = this.smoothed
      ? [
          this.smoothed[0] + alpha * (angles[0] - this.smoothed[0]),
          this.smoothed[1] + alpha * (angles[1] - this.smoothed[1]),
        ]
      : angles;
    current.smoothedAngles = [...this.smoothed];

    if (!this.bottom || this.phase === "waiting-bottom") {
      return this.observeBottom(current);
    }
    if (this.phase === "rearming") return this.observeRearm(current);
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
      this.bottomArms = sample.arms;
      this.phase = "bottom";
      return this.result("tracking", sample.arms[0], sample.arms[1]);
    }
    return this.result("start-position", sample.arms[0], sample.arms[1]);
  }

  private observeRearm(sample: Sample): CounterResult {
    const angles = this.smoothed ?? sample.angles;
    const baseline = this.bottom!;
    if (angles[0] > baseline[0] + 15 || angles[1] > baseline[1] + 15) {
      this.rearmStart = 0;
      this.rearmTotals = [0, 0];
      this.rearmSamples = 0;
      return this.result("return-bottom", sample.arms[0], sample.arms[1]);
    }
    if (!this.rearmStart) this.rearmStart = sample.timestamp;
    this.rearmTotals[0] += angles[0];
    this.rearmTotals[1] += angles[1];
    this.rearmSamples += 1;
    if (sample.timestamp - this.rearmStart >= 250 && this.rearmSamples >= 2) {
      this.bottom = [
        this.rearmTotals[0] / this.rearmSamples,
        this.rearmTotals[1] / this.rearmSamples,
      ];
      this.bottomArms = sample.arms;
      this.rearmStart = 0;
      this.rearmTotals = [0, 0];
      this.rearmSamples = 0;
      this.phase = "bottom";
      return this.result("tracking", sample.arms[0], sample.arms[1]);
    }
    return this.result("return-bottom", sample.arms[0], sample.arms[1]);
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
    if (this.crossingTimes.some((value) => value !== null)) this.appendCandidateSample(sample);
    this.observeBothAtTop(angles, bottom);
    if (this.crossingTimes[0] === null && this.crossingTimes[1] === null) {
      this.candidateSamples = [];
      this.candidateSamplesUsable = true;
      return this.result("tracking", sample.arms[0], sample.arms[1]);
    }

    for (const index of [0, 1] as const) {
      if (this.crossingTimes[index] !== null && angles[index] < bottom[index] + 8) {
        const other = index === 0 ? 1 : 0;
        if (this.crossingTimes[other] !== null) {
          this.clearCandidate(false);
          return this.result("start-position", sample.arms[0], sample.arms[1]);
        }
        this.crossingTimes[index] = null;
      }
    }

    if (angles[0] >= bottom[0] + MIN_BEND_DEGREES && angles[1] >= bottom[1] + MIN_BEND_DEGREES) {
      this.phase = "curl";
      const liftTimes = this.crossingTimes.filter((value): value is number => value !== null);
      this.candidateStart = liftTimes.length ? Math.min(...liftTimes) : sample.timestamp;
      this.startArms = this.bottomArms ?? sample.arms;
      this.peaks = [...angles];
      this.peakTimes = [sample.timestamp, sample.timestamp];
      this.peakArms = [...sample.arms];
    }
    return this.result(this.phase === "curl" ? "tracking" : "return-bottom", sample.arms[0], sample.arms[1]);
  }

  private observeCurl(sample: Sample, allowCount: boolean): CounterResult {
    const angles = this.smoothed ?? sample.angles;
    const bottom = this.bottom!;
    this.appendCandidateSample(sample);
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

    this.observeBothAtTop(angles, bottom);
    const returned = angles[0] <= bottom[0] + 15 && angles[1] <= bottom[1] + 15;
    if (!returned) return this.result("tracking", sample.arms[0], sample.arms[1]);

    const startArms = this.startArms!;
    const peaks = this.peakArms;
    const bothPeaks = !!peaks[0] && !!peaks[1];
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
    const wristsRose = bothPeaks && plausibility.every(({ armLength, wristRise }) =>
      armLength > 1 && wristRise >= 0.25 * armLength,
    );
    const elbowsStayed = bothPeaks && plausibility.every(({ armLength, elbowShift }) =>
      armLength > 1 && elbowShift <= 0.5 * armLength,
    );
    const plausibleCurl = wristsRose && elbowsStayed;

    const completedCurl = this.observedBothAtTop && enoughBend && enoughTime && plausibleCurl;
    this.lastRejection = completedCurl
      ? null
      : !this.observedBothAtTop
        ? "Both arms need to reach the top together."
        : !enoughBend
          ? "Curl farther before returning to the start."
          : !enoughTime
            ? "The curl was too brief. Move smoothly and pause at the top."
            : !wristsRose
              ? "Raise both wrists higher through the curl."
              : "Keep elbows closer to your sides.";
    let completedRep: CompletedRepSamples | null = null;
    if (allowCount && completedCurl) {
      this.count += 1;
      if (this.candidateSamplesUsable) completedRep = { endTimestampMs: sample.timestamp, samples: [...this.candidateSamples] };
    }
    this.clearCandidate(!completedCurl);
    if (completedCurl) {
      this.phase = "rearming";
      this.rearmStart = 0;
      this.rearmTotals = [0, 0];
      this.rearmSamples = 0;
    }
    return this.result(completedCurl ? "tracking" : "start-position", sample.arms[0], sample.arms[1], completedRep);
  }

  private appendCandidateSample(sample: Sample): void {
    if (!sample.smoothedAngles || !this.candidateSamplesUsable) return;
    if (this.candidateSamples.length >= 500) {
      this.candidateSamples = [];
      this.candidateSamplesUsable = false;
      return;
    }
    this.candidateSamples.push({
      timestampMs: sample.timestamp,
      leftFlexionDeg: sample.smoothedAngles[0],
      rightFlexionDeg: sample.smoothedAngles[1],
    });
  }

  private observeBothAtTop(angles: [number, number], bottom: [number, number]): void {
    const topThresholds = bottom.map((angle) => Math.max(angle + MIN_BEND_DEGREES, MIN_TOP_FLEXION_DEGREES));
    if (angles[0] >= topThresholds[0] && angles[1] >= topThresholds[1]) {
      this.observedBothAtTop = true;
    }
  }
}
