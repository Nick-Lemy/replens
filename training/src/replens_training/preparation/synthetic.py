"""Generate clearly marked synthetic examples for pipeline smoke checks."""

from __future__ import annotations

import numpy as np
import pandas as pd


def generate(
    participants: int,
    sets_per_participant: int,
    seed: int,
) -> pd.DataFrame:
    """Return illustrative synthetic per-rep rows; these are not study data."""
    for name, value in (
        ("participants", participants),
        ("sets_per_participant", sets_per_participant),
        ("seed", seed),
    ):
        if isinstance(value, bool) or not isinstance(value, (int, np.integer)):
            raise TypeError(f"{name} must be an integer")
    if participants < 1:
        raise ValueError("participants must be at least 1")
    if sets_per_participant < 1:
        raise ValueError("sets_per_participant must be at least 1")

    rng = np.random.default_rng(seed)
    rows: list[dict[str, object]] = []

    for participant_index in range(participants):
        participant_id = f"SYN{participant_index + 1:03d}"
        participant_effect = rng.normal(0.0, 8.0)

        for set_index in range(sets_per_participant):
            set_id = f"S{set_index + 1:02d}"
            total_reps = int(rng.integers(8, 15))
            set_effect = rng.normal(0.0, 6.0)

            for rep in range(1, total_reps + 1):
                reps_left = total_reps - rep
                mean_speed = max(
                    0.0,
                    34.0
                    + 3.2 * reps_left
                    + participant_effect
                    + set_effect
                    + rng.normal(0.0, 7.0),
                )
                peak_speed = mean_speed + rng.gamma(shape=2.0, scale=6.0)
                instability = rng.lognormal(mean=-1.2, sigma=0.55)

                rows.append(
                    {
                        "participant_id": participant_id,
                        "set_id": set_id,
                        "rep": rep,
                        "reps_left": reps_left,
                        "data_source": "synthetic",
                        "rir_label_status": "synthetic_only",
                        "mean_up_speed_deg_s": mean_speed,
                        "peak_up_speed_deg_s": peak_speed,
                        "movement_instability": instability,
                    }
                )

    return pd.DataFrame.from_records(rows)
