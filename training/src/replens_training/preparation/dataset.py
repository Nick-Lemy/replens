"""Validation and participant-wise splitting for synthetic pipeline smoke data."""

from __future__ import annotations

import math
import numbers
import re

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit


_REQUIRED_COLUMNS = {
    "participant_id",
    "set_id",
    "rep",
    "reps_left",
    "data_source",
    "rir_label_status",
    "mean_up_speed_deg_s",
    "peak_up_speed_deg_s",
    "movement_instability",
}
_MEASUREMENT_COLUMNS = (
    "mean_up_speed_deg_s",
    "peak_up_speed_deg_s",
    "movement_instability",
)
_PARTICIPANT_ID = re.compile(r"SYN\d{3,}\Z")
_SET_ID = re.compile(r"S\d{2,}\Z")


def validate_synthetic(table: pd.DataFrame) -> pd.DataFrame:
    """Validate a synthetic-only per-rep table and return a defensive copy."""
    if not isinstance(table, pd.DataFrame):
        raise TypeError("table must be a pandas DataFrame")
    if not table.columns.is_unique:
        raise ValueError("column names must be unique")
    missing = _REQUIRED_COLUMNS.difference(table.columns)
    if missing:
        raise ValueError(f"missing required columns: {', '.join(sorted(missing))}")
    if table.empty:
        raise ValueError("table must contain at least one row")

    validated = table.copy()
    if not validated["data_source"].eq("synthetic").fillna(False).all():
        raise ValueError("only data_source='synthetic' rows are allowed")
    if not validated["rir_label_status"].eq("synthetic_only").fillna(False).all():
        raise ValueError("only rir_label_status='synthetic_only' rows are allowed")

    if not validated["participant_id"].map(
        lambda value: bool(isinstance(value, str) and _PARTICIPANT_ID.fullmatch(value))
    ).all():
        raise ValueError("participant_id values must use SYN001-style IDs")
    if not validated["set_id"].map(
        lambda value: bool(isinstance(value, str) and _SET_ID.fullmatch(value))
    ).all():
        raise ValueError("set_id values must use S01-style IDs")

    numeric_columns = ("rep", "reps_left", *_MEASUREMENT_COLUMNS)
    for column in numeric_columns:
        if not pd.api.types.is_numeric_dtype(validated[column].dtype) or pd.api.types.is_bool_dtype(
            validated[column].dtype
        ):
            raise ValueError(f"{column} must contain numeric values")
        values = validated[column].to_numpy(dtype=float, na_value=np.nan)
        if not np.isfinite(values).all():
            raise ValueError(f"{column} must contain only finite values")
        if (values < 0).any():
            raise ValueError(f"{column} must be nonnegative")

    for column in ("rep", "reps_left"):
        values = validated[column].to_numpy(dtype=float, na_value=np.nan)
        if not np.equal(values, np.floor(values)).all():
            raise ValueError(f"{column} must contain integers")

    if validated.duplicated(["participant_id", "set_id", "rep"]).any():
        raise ValueError("participant, set, and rep rows must be unique")

    for _, group in validated.groupby(["participant_id", "set_id"], sort=False):
        ordered = group.sort_values("rep")
        reps = ordered["rep"].to_numpy(dtype=int)
        targets = ordered["reps_left"].to_numpy(dtype=int)
        expected_reps = np.arange(1, len(ordered) + 1)
        if not np.array_equal(reps, expected_reps):
            raise ValueError("rep numbers must be contiguous and start at 1 in each set")
        expected_target_steps = -np.ones(len(targets) - 1, dtype=int)
        if targets[-1] != 0 or not np.array_equal(
            np.diff(targets), expected_target_steps
        ):
            raise ValueError("reps_left must decrease by 1 per rep and end at 0 in each set")

    return validated


def split_participants(
    table: pd.DataFrame,
    test_fraction: float,
    seed: int,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split whole synthetic participants into train and test DataFrames."""
    validated = validate_synthetic(table)
    if isinstance(test_fraction, bool) or not isinstance(test_fraction, numbers.Real):
        raise TypeError("test_fraction must be a number between 0 and 1")
    if not math.isfinite(float(test_fraction)) or not 0.0 < test_fraction < 1.0:
        raise ValueError("test_fraction must be between 0 and 1")
    if isinstance(seed, bool) or not isinstance(seed, (int, np.integer)):
        raise TypeError("seed must be an integer")

    participant_count = validated["participant_id"].nunique()
    if participant_count < 4:
        raise ValueError("at least 4 unique synthetic participants are required")
    test_group_count = math.ceil(float(test_fraction) * participant_count)
    if test_group_count >= participant_count:
        raise ValueError("test_fraction must leave at least one participant for training")

    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=float(test_fraction),
        random_state=int(seed),
    )
    train_indices, test_indices = next(
        splitter.split(validated, groups=validated["participant_id"])
    )
    train = validated.iloc[train_indices].copy()
    test = validated.iloc[test_indices].copy()
    if not set(train["participant_id"]).isdisjoint(test["participant_id"]):
        raise RuntimeError("participant split leakage detected")
    return train, test
