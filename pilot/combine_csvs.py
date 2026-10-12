"""Combine one CSV per curl set into a single rep table."""

from argparse import ArgumentParser
from pathlib import Path
import re

import pandas as pd


REQUIRED = {"participant_id", "set_id", "rep", "reps_left", "rir_label_status"}


def combine(folder: Path, output: Path) -> tuple[int, int, int]:
    files = sorted(
        path for path in folder.glob("*_reps.csv")
        if path.resolve() != output.resolve() and path.name != "combined_reps.csv"
    )
    if not files:
        raise ValueError(f"No set CSV files found in {folder}")

    tables = []
    columns = None
    for path in files:
        table = pd.read_csv(path, dtype={"participant_id": str, "set_id": str})
        missing = REQUIRED - set(table.columns)
        if missing:
            raise ValueError(f"{path.name} is missing: {', '.join(sorted(missing))}")
        if columns is None:
            columns = list(table.columns)
        elif set(table.columns) != set(columns):
            raise ValueError(f"{path.name} has different columns from the other set files")

        pairs = table[["participant_id", "set_id"]].drop_duplicates()
        if len(pairs) != 1 or table.empty:
            raise ValueError(f"{path.name} must contain one nonempty set")
        participant_id, set_id = pairs.iloc[0]
        if not re.fullmatch(r"P\d{3}", participant_id):
            raise ValueError(f"{path.name} has a demo or invalid participant ID; keep demo clips separate")
        if not re.fullmatch(r"S\d{2}", set_id):
            raise ValueError(f"{path.name} has an invalid set ID")
        if path.name != f"{participant_id}_{set_id}_reps.csv":
            raise ValueError(f"{path.name} does not match the participant and set IDs inside")

        reps = pd.to_numeric(table["rep"], errors="coerce")
        if reps.isna().any() or sorted(reps.tolist()) != list(range(1, len(table) + 1)):
            raise ValueError(f"{path.name} must have one row for each rep, numbered from 1")
        statuses = set(table["rir_label_status"].dropna())
        if statuses == {"unlabeled"}:
            if table["reps_left"].notna().any():
                raise ValueError(f"{path.name} has RIR values despite being unlabeled")
        elif statuses == {"reviewer_confirmed_failure"}:
            expected = len(table) - reps
            actual = pd.to_numeric(table["reps_left"], errors="coerce")
            if actual.isna().any() or not (actual == expected).all():
                raise ValueError(f"{path.name} has RIR values inconsistent with its rep count")
        else:
            raise ValueError(f"{path.name} has mixed or unknown RIR label status")
        tables.append(table[columns])

    combined = pd.concat(tables, ignore_index=True)
    if combined.duplicated(["participant_id", "set_id", "rep"]).any():
        raise ValueError("The set files contain duplicate participant, set, and rep IDs")
    combined = combined.sort_values(["participant_id", "set_id", "rep"])
    output.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(output, index=False)
    return len(files), combined["participant_id"].nunique(), len(combined)


if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path, help="Folder containing P001_S01_reps.csv files")
    parser.add_argument("--output", type=Path, help="Combined CSV path; defaults to folder/combined_reps.csv")
    args = parser.parse_args()
    destination = args.output or args.folder / "combined_reps.csv"
    sets, people, reps = combine(args.folder, destination)
    print(f"Combined {sets} sets from {people} participants ({reps} reps) into {destination}")
