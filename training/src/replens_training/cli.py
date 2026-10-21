import argparse
from datetime import datetime, timezone
import hashlib
from importlib.metadata import version
import json
from pathlib import Path

import joblib
import numpy as np

from .evaluation.compare import score_predictions
from .export.onnx_model import export_synthetic_onnx
from .estimators.train import fit_ridge
from .features.definitions import FEATURE_UNITS, MOVEMENT_FEATURES, SPEED_FEATURES, feature_matrix
from .preparation.dataset import split_participants, validate_synthetic
from .preparation.synthetic import generate

ROOT = Path(__file__).resolve().parents[2]
NOTICE = "SYNTHETIC ONLY: software check, not research evidence or a deployable RIR model."


def write_json(path: Path, content: dict) -> None:
    path.write_text(json.dumps(content, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def run(config: dict) -> Path:
    if not isinstance(config, dict):
        raise ValueError("Configuration must be a JSON object.")
    expected = {"seed", "participants", "sets_per_participant", "test_fraction", "ridge_alpha"}
    if set(config) != expected:
        raise ValueError(f"Configuration must contain exactly: {', '.join(sorted(expected))}")
    for key in ("seed", "participants", "sets_per_participant"):
        if type(config[key]) is not int:
            raise ValueError(f"{key} must be an integer.")
    if config["seed"] < 0 or config["participants"] < 4 or config["sets_per_participant"] < 1:
        raise ValueError("Use a nonnegative seed, at least four synthetic people and one set each.")
    for key in ("test_fraction", "ridge_alpha"):
        if type(config[key]) not in (int, float) or not np.isfinite(config[key]):
            raise ValueError(f"{key} must be a finite number.")
    if not 0 < config["test_fraction"] < 1 or config["ridge_alpha"] <= 0:
        raise ValueError("Test fraction must be between zero and one; alpha must be positive.")

    table = validate_synthetic(generate(
        config["participants"], config["sets_per_participant"], config["seed"],
    ))
    train, test = split_participants(table, config["test_fraction"], config["seed"])
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output = ROOT / "artifacts" / "synthetic" / run_id
    models = output / "models"
    reports = output / "reports"
    data = ROOT / "data" / "synthetic" / run_id
    for directory in (models, reports, data):
        directory.mkdir(parents=True, exist_ok=False)
    dataset_path = data / "reps.csv"
    table.to_csv(dataset_path, index=False)
    train.to_csv(data / "train.csv", index=False)
    test.to_csv(data / "test.csv", index=False)

    truth = train["reps_left"].to_numpy(dtype=np.float32)
    predictions = test[["participant_id", "set_id", "rep", "data_source", "reps_left"]].copy()
    constant = np.full(len(test), float(np.median(truth)))
    predictions["training_median_prediction"] = constant
    scores = {"training_median": score_predictions(test, constant)}
    contracts = {}
    for name, features in {"speed_only": SPEED_FEATURES, "speed_movement": MOVEMENT_FEATURES}.items():
        inputs = feature_matrix(train, features)
        held_out = feature_matrix(test, features)
        pipeline = fit_ridge(inputs, truth, config["ridge_alpha"])
        predicted = pipeline.predict(held_out)
        predictions[f"{name}_prediction"] = predicted
        scores[name] = score_predictions(test, predicted)
        joblib.dump({
            "pipeline": pipeline,
            "data_source": "synthetic",
            "deployment_approved": False,
            "feature_order": features,
        }, models / f"{name}.joblib")
        parity = export_synthetic_onnx(pipeline, held_out, features, models / f"{name}.onnx")
        contracts[name] = {
            "data_source": "synthetic",
            "deployment_approved": False,
            "input_name": "features",
            "input_dtype": "float32",
            "input_shape": [None, len(features)],
            "feature_order": features,
            "feature_units": {key: FEATURE_UNITS[key] for key in features},
            "feature_definition_version": "synthetic-pilot-angular-v1",
            "preprocessing": "StandardScaler included in ONNX; do not scale twice",
            "output": "raw continuous RIR estimate; not rounded or clamped",
            "parity": parity,
        }
    predictions.to_csv(reports / "predictions.csv", index=False)
    write_json(reports / "metrics.json", {"notice": NOTICE, "scores": scores})
    write_json(models / "contracts.json", contracts)
    write_json(output / "run.json", {
        "notice": NOTICE,
        "data_source": "synthetic",
        "deployment_approved": False,
        "config": config,
        "data_directory": str(data.relative_to(ROOT)),
        "dataset_sha256": hashlib.sha256(dataset_path.read_bytes()).hexdigest(),
        "train_participants": sorted(train["participant_id"].unique().tolist()),
        "test_participants": sorted(test["participant_id"].unique().tolist()),
        "train_reps": len(train),
        "test_reps": len(test),
        "versions": {name: version(name) for name in (
            "numpy", "pandas", "scikit-learn", "skl2onnx", "onnx", "onnxruntime", "joblib",
        )},
    })
    print(NOTICE)
    for name, metrics in scores.items():
        print(f"{name}: synthetic MAE {metrics['mae_reps']:.3f} reps")
    print(f"Outputs: {output}")
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the isolated RepLens synthetic pipeline.")
    parser.add_argument("--config", type=Path, default=ROOT / "configs" / "synthetic.json")
    args = parser.parse_args()
    try:
        run(json.loads(args.config.read_text(encoding="utf-8")))
    except (ValueError, OSError) as error:
        parser.exit(1, f"Synthetic experiment failed: {error}\n")
