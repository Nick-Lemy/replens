"""Turn a curl video into automatically detected reps and movement measurements."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlretrieve
import subprocess

import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
from scipy.signal import find_peaks, savgol_filter


MODELS = {
    name: (
        f"https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
        f"pose_landmarker_{name}/float16/1/pose_landmarker_{name}.task"
    )
    for name in ("full", "heavy")
}
LANDMARKS = {
    "left": (11, 13, 15),
    "right": (12, 14, 16),
}


@dataclass
class Analysis:
    frames: pd.DataFrame
    reps: pd.DataFrame
    diagnostics: pd.DataFrame
    annotated_mp4: bytes
    preview_rgb: np.ndarray | None
    fps: float
    duration_s: float
    tracked_fraction: float
    left_tracked_fraction: float
    right_tracked_fraction: float
    model_variant: str


def ensure_model(variant: str) -> Path:
    if variant not in MODELS:
        raise ValueError(f"Unknown pose model: {variant}")
    path = Path(__file__).parent / "models" / f"pose_landmarker_{variant}.task"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".download")
        try:
            urlretrieve(MODELS[variant], temporary)
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
    return path


def _angle(shoulder: np.ndarray, elbow: np.ndarray, wrist: np.ndarray) -> float:
    a = shoulder - elbow
    b = wrist - elbow
    denominator = np.linalg.norm(a) * np.linalg.norm(b)
    if denominator < 1e-8:
        return np.nan
    cosine = np.clip(np.dot(a, b) / denominator, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosine)))


def _landmarks(result, frame_rgb: np.ndarray) -> dict[str, float]:
    row = {key: np.nan for key in (
        "left_flexion", "right_flexion", "left_wrist_x", "left_wrist_y",
        "right_wrist_x", "right_wrist_y", "left_elbow_x", "left_elbow_y",
        "right_elbow_x", "right_elbow_y", "left_upper_arm", "right_upper_arm",
        "left_shoulder_x", "left_shoulder_y", "right_shoulder_x", "right_shoulder_y",
        "shoulder_width",
    )}
    if not result.pose_landmarks:
        return row

    points = result.pose_landmarks[0]
    shoulders = [points[11], points[12]]
    if min(p.visibility for p in shoulders) >= 0.6:
        row["shoulder_width"] = float(np.hypot(
            shoulders[0].x - shoulders[1].x,
            shoulders[0].y - shoulders[1].y,
        ))

    for side, indices in LANDMARKS.items():
        shoulder, elbow, wrist = (points[i] for i in indices)
        if min(p.visibility for p in (shoulder, elbow, wrist)) < 0.6:
            continue
        s = np.array([shoulder.x, shoulder.y])
        e = np.array([elbow.x, elbow.y])
        w = np.array([wrist.x, wrist.y])
        row[f"{side}_flexion"] = 180.0 - _angle(s, e, w)
        row[f"{side}_shoulder_x"] = float(s[0])
        row[f"{side}_shoulder_y"] = float(s[1])
        row[f"{side}_wrist_x"] = float(w[0] - s[0])
        row[f"{side}_wrist_y"] = float(w[1] - s[1])
        row[f"{side}_elbow_x"] = float(e[0] - s[0])
        row[f"{side}_elbow_y"] = float(e[1] - s[1])
        row[f"{side}_upper_arm"] = float(np.linalg.norm(e - s))
        height, width = frame_rgb.shape[:2]
        for point in (shoulder, elbow, wrist):
            cv2.circle(frame_rgb, (int(point.x * width), int(point.y * height)), 6, (255, 210, 0), -1)
        cv2.line(frame_rgb, (int(s[0] * width), int(s[1] * height)),
                 (int(e[0] * width), int(e[1] * height)), (80, 230, 255), 3)
        cv2.line(frame_rgb, (int(e[0] * width), int(e[1] * height)),
                 (int(w[0] * width), int(w[1] * height)), (80, 230, 255), 3)
    return row


def _smooth(values: pd.Series, fps: float) -> np.ndarray:
    missing_limit = max(1, int(round(0.2 * fps)))
    filled = values.interpolate(limit=missing_limit, limit_area="inside").to_numpy(dtype=float)
    window = max(5, int(round(0.25 * fps)) | 1)
    if len(filled) < window:
        return filled
    output = np.full_like(filled, np.nan)
    valid = np.isfinite(filled)
    edges = np.diff(np.r_[False, valid, False].astype(int))
    for start, end in zip(np.where(edges == 1)[0], np.where(edges == -1)[0]):
        segment = filled[start:end]
        if len(segment) >= window:
            output[start:end] = savgol_filter(segment, window, 2)
        else:
            output[start:end] = segment
    return output


def _instability(frames: pd.DataFrame, start: int, peak: int, fps: float) -> float:
    width = frames["shoulder_width"].iloc[start:peak + 1].to_numpy(dtype=float)
    if np.isfinite(width).sum() < 7 or np.nanmedian(width) < 0.03:
        return np.nan
    residuals = []
    window = max(7, int(round(0.4 * fps)) | 1)
    for side in ("left", "right"):
        for axis in ("x", "y"):
            values = frames[f"{side}_wrist_{axis}"].iloc[start:peak + 1].to_numpy(dtype=float) / width
            if len(values) < window or not np.isfinite(values).all():
                return np.nan
            trend = savgol_filter(values, window, 2)
            residuals.append(values - trend)
    return float(np.sqrt(np.mean(np.concatenate(residuals) ** 2)))


def detect_reps(frames: pd.DataFrame, fps: float) -> pd.DataFrame:
    """Find full bottom-to-top-to-bottom movements shared by both arms."""
    left = _smooth(frames["left_flexion"], fps)
    right = _smooth(frames["right_flexion"], fps)
    both = np.where(np.isfinite(left) & np.isfinite(right), (left + right) / 2, np.nan)
    frames["left_flexion_smooth"] = left
    frames["right_flexion_smooth"] = right
    frames["mean_flexion"] = both
    if np.isfinite(both).sum() < 10:
        frames.attrs["diagnostics"] = pd.DataFrame([{"time_s": None, "result": "Not enough frames with both arms tracked"}])
        return pd.DataFrame()

    search_signal = pd.Series(both).interpolate(limit_area="inside").to_numpy()
    search_signal = np.nan_to_num(search_signal, nan=-1000.0)
    peaks, _ = find_peaks(search_signal, prominence=25, distance=max(1, int(0.65 * fps)))
    reps = []
    diagnostics = []
    times = frames["time_s"].to_numpy(dtype=float)
    bottom_reference = float(np.nanpercentile(both, 15))
    for j, peak in enumerate(peaks):
        def note(result: str) -> None:
            diagnostics.append({"time_s": round(float(times[peak]), 2), "result": result})

        left_edge = 0 if j == 0 else int(peaks[j - 1])
        right_edge = len(both) - 1 if j == len(peaks) - 1 else int(peaks[j + 1])
        before = both[left_edge:peak + 1]
        after = both[peak:right_edge + 1]
        if not np.isfinite(before).any() or not np.isfinite(after).any():
            note("Rejected: start or finish not visible")
            continue
        start = left_edge + int(np.where(before <= np.nanmin(before) + 5)[0][-1])
        end = peak + int(np.where(after <= np.nanmin(after) + 5)[0][0])
        if start >= peak or peak >= end:
            note("Rejected: no full up-and-down movement")
            continue
        if times[peak] - times[start] < 0.35 or times[end] - times[peak] < 0.35:
            note("Rejected: movement too brief")
            continue
        if times[end] - times[start] > 20:
            note("Rejected: movement too long")
            continue
        if np.isfinite(both[start:end + 1]).mean() < 0.8:
            note("Rejected: arm tracking lost")
            continue
        if min(both[peak] - both[start], both[peak] - both[end]) < 25:
            note("Rejected: elbow did not bend and straighten enough")
            continue
        if max(both[start], both[end]) > bottom_reference + 18:
            note("Rejected: arm did not return to the bottom")
            continue
        left_gain = np.nanmax(left[start:peak + 1]) - left[start]
        right_gain = np.nanmax(right[start:peak + 1]) - right[start]
        if min(left_gain, right_gain) < 25:
            note("Rejected: one arm did not curl enough")
            continue
        left_peak = start + int(np.nanargmax(left[start:end + 1]))
        right_peak = start + int(np.nanargmax(right[start:end + 1]))
        if abs(times[left_peak] - times[right_peak]) > 0.5:
            note("Rejected: arms moved at different times")
            continue
        curl_motion = True
        for side in ("left", "right"):
            arm_length = float(np.nanmedian(frames[f"{side}_upper_arm"].iloc[start:end + 1]))
            wrist_rise = frames[f"{side}_wrist_y"].iloc[start] - frames[f"{side}_wrist_y"].iloc[peak]
            elbow_shift = np.hypot(
                frames[f"{side}_elbow_x"].iloc[peak] - frames[f"{side}_elbow_x"].iloc[start],
                frames[f"{side}_elbow_y"].iloc[peak] - frames[f"{side}_elbow_y"].iloc[start],
            )
            if not np.isfinite(arm_length) or arm_length < 0.02 or wrist_rise < 0.25 * arm_length or elbow_shift > 0.5 * arm_length:
                curl_motion = False
        if not curl_motion:
            note("Rejected: wrist did not rise or elbow moved too far")
            continue
        up_duration = times[peak] - times[start]
        range_deg = both[peak] - both[start]
        velocity = np.gradient(both[start:peak + 1], times[start:peak + 1])
        if np.nanmax(velocity) > 400:
            note("Rejected: sudden tracking jump")
            continue
        reps.append({
            "rep": len(reps) + 1,
            "start_s": round(float(times[start]), 2),
            "top_s": round(float(times[peak]), 2),
            "end_s": round(float(times[end]), 2),
            "up_time_s": round(float(up_duration), 2),
            "curl_range_deg": round(float(range_deg), 1),
            "mean_up_speed_deg_s": round(float(range_deg / up_duration), 1),
            "peak_up_speed_deg_s": round(float(np.nanmax(velocity)), 1),
            "movement_instability": round(_instability(frames, start, peak, fps), 4),
            "reps_left": np.nan,
        })
        note(f"Counted as rep {len(reps)}")
    frames.attrs["diagnostics"] = pd.DataFrame(diagnostics)
    return pd.DataFrame(reps)


def _draw_overlay(frame_bgr: np.ndarray, row: pd.Series, count: int, phase: str) -> np.ndarray:
    height, width = frame_bgr.shape[:2]
    panel_height = min(48, height // 5)
    cv2.rectangle(frame_bgr, (0, 0), (width, panel_height), (20, 25, 35), -1)
    cv2.putText(frame_bgr, f"COUNT {count}", (12, 33), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2)
    cv2.putText(frame_bgr, phase, (max(180, width // 3), 31), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (80, 220, 255), 2)
    cv2.rectangle(frame_bgr, (0, height - 42), (width, height), (20, 25, 35), -1)

    for side, color in (("left", (255, 180, 50)), ("right", (80, 230, 100))):
        keys = [f"{side}_shoulder_x", f"{side}_shoulder_y", f"{side}_elbow_x",
                f"{side}_elbow_y", f"{side}_wrist_x", f"{side}_wrist_y"]
        if not np.isfinite(row[keys].to_numpy(dtype=float)).all():
            continue
        shoulder = np.array([row[f"{side}_shoulder_x"], row[f"{side}_shoulder_y"]])
        elbow = shoulder + np.array([row[f"{side}_elbow_x"], row[f"{side}_elbow_y"]])
        wrist = shoulder + np.array([row[f"{side}_wrist_x"], row[f"{side}_wrist_y"]])
        pixels = [(int(p[0] * width), int(p[1] * height)) for p in (shoulder, elbow, wrist)]
        cv2.line(frame_bgr, pixels[0], pixels[1], color, 4)
        cv2.line(frame_bgr, pixels[1], pixels[2], color, 4)
        for label, point in zip(("S", "E", "W"), pixels):
            cv2.circle(frame_bgr, point, 7, color, -1)
            cv2.putText(frame_bgr, label, (point[0] + 8, point[1] - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        bend = row[f"{side}_flexion_smooth"]
        if np.isfinite(bend):
            x = 12 if side == "left" else width // 2
            cv2.putText(frame_bgr, f"{side.upper()} {bend:.0f} deg", (x, height - 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
    return frame_bgr


def _annotated_video(video_path: str | Path, frames: pd.DataFrame, reps: pd.DataFrame, fps: float) -> bytes:
    """Make a browser-playable video showing landmarks, phase, and running count."""
    capture = cv2.VideoCapture(str(video_path))
    starts = reps["start_s"].to_numpy(dtype=float) if not reps.empty else np.array([])
    tops = reps["top_s"].to_numpy(dtype=float) if not reps.empty else np.array([])
    ends = reps["end_s"].to_numpy(dtype=float) if not reps.empty else np.array([])
    try:
        with TemporaryDirectory() as folder:
            folder = Path(folder)
            raw_path = folder / "overlay_raw.mp4"
            output_path = folder / "overlay.mp4"
            writer = None
            try:
                for index, row in frames.iterrows():
                    ok, frame = capture.read()
                    if not ok:
                        break
                    height, width = frame.shape[:2]
                    if width > 960:
                        frame = cv2.resize(frame, (960, round(height * 960 / width)))
                    if writer is None:
                        height, width = frame.shape[:2]
                        writer = cv2.VideoWriter(str(raw_path), cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
                        if not writer.isOpened():
                            raise RuntimeError("Could not create the annotated video.")
                    time_s = float(row["time_s"])
                    count = int(np.searchsorted(ends, time_s, side="right"))
                    phase = "WAITING FOR CURL"
                    if not np.isfinite(row[["left_flexion", "right_flexion"]].to_numpy(dtype=float)).all():
                        phase = "ARMS NOT TRACKED"
                    for start, top, end in zip(starts, tops, ends):
                        if start <= time_s < end:
                            phase = "LIFTING" if time_s < top else "LOWERING"
                            break
                    writer.write(_draw_overlay(frame, row, count, phase))
            finally:
                if writer is not None:
                    writer.release()
            result = subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw_path),
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "25",
                 "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(output_path)],
                capture_output=True, text=True,
            )
            if result.returncode != 0:
                raise RuntimeError(f"Could not encode the annotated video: {result.stderr.strip()}")
            return output_path.read_bytes()
    finally:
        capture.release()


def analyze_video(video_path: str | Path, max_seconds: int = 120, model_variant: str = "full") -> Analysis:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError("Could not open this video. Try an MP4 or MOV recorded on a phone.")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    if not 5 <= fps <= 120:
        capture.release()
        raise ValueError("The video frame rate could not be read reliably.")
    model_path = ensure_model(model_variant)
    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        num_poses=1,
    )
    rows = []
    preview = None
    max_frames = int(max_seconds * fps)
    previous_timestamp_ms = -1
    try:
        with mp.tasks.vision.PoseLandmarker.create_from_options(options) as landmarker:
            for index in range(max_frames):
                ok, frame_bgr = capture.read()
                if not ok:
                    break
                height, width = frame_bgr.shape[:2]
                if width > 960:
                    frame_bgr = cv2.resize(frame_bgr, (960, round(height * 960 / width)))
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                reported_ms = capture.get(cv2.CAP_PROP_POS_MSEC)
                fallback_ms = round(index * 1000 / fps)
                timestamp_ms = round(reported_ms) if np.isfinite(reported_ms) and reported_ms > previous_timestamp_ms else fallback_ms
                timestamp_ms = max(timestamp_ms, previous_timestamp_ms + 1)
                previous_timestamp_ms = timestamp_ms
                image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
                result = landmarker.detect_for_video(image, timestamp_ms)
                annotated = frame_rgb.copy()
                row = _landmarks(result, annotated)
                row["time_s"] = timestamp_ms / 1000
                rows.append(row)
                if preview is None and np.isfinite(row["left_flexion"]) and np.isfinite(row["right_flexion"]):
                    preview = annotated
    finally:
        capture.release()
    if not rows:
        raise ValueError("The video contains no readable frames.")
    frames = pd.DataFrame(rows)
    reps = detect_reps(frames, fps)
    diagnostics = frames.attrs.get("diagnostics", pd.DataFrame())
    frames.attrs.clear()
    tracked = frames[["left_flexion", "right_flexion"]].notna().all(axis=1).mean()
    left_tracked = frames["left_flexion"].notna().mean()
    right_tracked = frames["right_flexion"].notna().mean()
    annotated_mp4 = _annotated_video(video_path, frames, reps, fps)
    return Analysis(frames, reps, diagnostics, annotated_mp4, preview, fps,
                    float(frames["time_s"].iloc[-1]), float(tracked),
                    float(left_tracked), float(right_tracked), model_variant)
