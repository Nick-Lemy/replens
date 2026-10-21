import numpy as np
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def fit_ridge(inputs: np.ndarray, targets: np.ndarray, alpha: float) -> Pipeline:
    if not np.isfinite(alpha) or alpha <= 0:
        raise ValueError("Ridge alpha must be positive and finite.")
    pipeline = Pipeline([
        ("scale", StandardScaler()),
        ("regressor", Ridge(alpha=alpha)),
    ])
    pipeline.fit(inputs, targets)
    return pipeline
