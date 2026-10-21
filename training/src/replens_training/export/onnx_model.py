import json
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
from sklearn.pipeline import Pipeline
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType


def export_synthetic_onnx(
    pipeline: Pipeline, samples: np.ndarray, features: list[str], path: Path,
) -> dict:
    model = convert_sklearn(
        pipeline,
        initial_types=[("features", FloatTensorType([None, len(features)]))],
        target_opset=17,
    )
    onnx.helper.set_model_props(model, {
        "data_source": "synthetic",
        "deployment_approved": "false",
        "feature_names": json.dumps(features),
        "feature_definition_version": "synthetic-pilot-angular-v1",
    })
    onnx.checker.check_model(model)
    encoded = model.SerializeToString()
    session = ort.InferenceSession(encoded, providers=["CPUExecutionProvider"])
    actual = session.run(None, {"features": samples.astype(np.float32)})[0].reshape(-1)
    expected = pipeline.predict(samples).reshape(-1)
    np.testing.assert_allclose(actual, expected, rtol=1e-4, atol=1e-4)
    path.write_bytes(encoded)
    return {
        "max_prediction_difference": float(np.max(np.abs(actual - expected))),
        "checked_reps": len(samples),
        "runtime": "onnxruntime CPU; browser runtime not checked",
    }
