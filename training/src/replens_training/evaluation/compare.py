import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error


def score_predictions(table: pd.DataFrame, predictions: np.ndarray) -> dict:
    truth = table["reps_left"].to_numpy(dtype=float)
    values = np.asarray(predictions, dtype=float).reshape(-1)
    if values.shape != truth.shape or not np.isfinite(values).all():
        raise ValueError("Each held-out rep needs one finite prediction.")
    errors = pd.DataFrame({
        "participant_id": table["participant_id"].to_numpy(),
        "absolute_error": np.abs(truth - values),
    })
    per_person = errors.groupby("participant_id")["absolute_error"].mean()
    return {
        "mae_reps": float(mean_absolute_error(truth, values)),
        "participant_mean_mae_reps": float(per_person.mean()),
        "per_participant_mae_reps": per_person.to_dict(),
    }
