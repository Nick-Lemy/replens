import numpy as np
import pandas as pd

SPEED_FEATURES = ["mean_up_speed_deg_s", "peak_up_speed_deg_s"]
MOVEMENT_FEATURES = [*SPEED_FEATURES, "movement_instability"]

FEATURE_UNITS = {
    "mean_up_speed_deg_s": "degrees/second",
    "peak_up_speed_deg_s": "degrees/second",
    "movement_instability": "synthetic dimensionless value; not validated muscle tremor",
}


def feature_matrix(table: pd.DataFrame, columns: list[str]) -> np.ndarray:
    if not columns or not set(columns).issubset(MOVEMENT_FEATURES):
        raise ValueError("Only the declared current-rep inputs are allowed.")
    values = table.loc[:, columns].to_numpy(dtype=np.float32)
    if not np.isfinite(values).all():
        raise ValueError("Feature values must be finite.")
    return values
