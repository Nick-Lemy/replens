# Model training and evaluation

This folder contains an isolated synthetic experiment for checking the training pipeline. It does not train on the six study videos, evaluate real people or provide the web app's RIR predictor.

## Run it

The separate Python environment is already installed on this computer. From the repository root:

```sh
training/.venv/bin/python training/run.py
```

To set up on another computer with Python 3.12:

```sh
python3.12 -m venv training/.venv
training/.venv/bin/python -m pip install -r training/requirements.txt
training/.venv/bin/python training/run.py
```

`requirements.in` lists direct dependencies; `requirements.txt` pins the resolved versions. The training environment is separate from the pilot environment and the pnpm web workspace.

## Folder structure

```text
training/
├── run.py                       Start the synthetic experiment
├── requirements.txt             Pinned Python dependencies
├── configs/synthetic.json       Seed, synthetic people, sets, split and Ridge setting
├── notebooks/                   Optional exploration or Google Colab notebooks
├── src/replens_training/
│   ├── cli.py                   Connect all experiment steps
│   ├── preparation/
│   │   ├── synthetic.py         Generate explicitly synthetic per-rep measurements
│   │   └── dataset.py           Reject mixed/invalid rows; split by participant
│   ├── features/definitions.py  Fixed feature order, units and numeric inputs
│   ├── estimators/train.py      Fit StandardScaler + Ridge on training rows only
│   ├── evaluation/compare.py    Calculate held-out prediction errors
│   └── export/onnx_model.py     Export both models and verify Python/ONNX agreement
├── data/                        Ignored local research files
│   ├── raw/                     Reviewed per-set CSVs; videos stay in approved storage
│   ├── processed/               Future combined study tables
│   └── synthetic/<run-id>/      Generated rows plus identical train/test split files
└── artifacts/                   Ignored generated outputs
    └── synthetic/<run-id>/
        ├── run.json             Settings, participant splits, versions, dataset hash
        ├── models/              Both Python/ONNX models and contracts.json
        └── reports/             metrics.json and per-rep predictions.csv
```

Empty tracked folders use `.gitkeep` files so Git preserves the structure. The local `data/` and `artifacts/` folders are ignored. Ignoring files does not replace approved research storage or access controls. Do not put names, consent forms, participant identity keys or research data in tracked folders. Clear notebook outputs before committing them.

## What the synthetic run does

1. Creates invented people (`SYN001` IDs) and invented complete sets. Every row is marked `synthetic` and `synthetic_only`.
2. Holds out whole synthetic participants. Both models use the same rows and split.
3. Fits two Ridge models: angular speed alone, and the same speeds plus movement instability. Scaling is learned from training rows only.
4. Compares their predictions against invented targets. A constant training-median prediction gives a basic reference. No settings are selected using test results.
5. Saves both models, exports ONNX with scaling included, and checks predictions against Python on every test row.

The fixed seed makes the generated data and split repeatable. A separate timestamped output folder prevents one run overwriting another. Each model and report is marked synthetic; no winner is automatically selected or deployed. Only load the joblib files you created yourself.

The generator deliberately makes speed loosely related to its invented RIR values. Movement instability is independently random; it is not designed to make the second model win. Any error or difference reflects these invented rules and chance, not physiology or study evidence.

The speeds are **elbow angular speeds in degrees/second**, matching pilot column names, not measured barbell speed. The current feature module selects columns; it does not extract movement from videos. Its synthetic instability values are not calibrated to camera measurements. Real-data processing must be checked separately, and browser and training feature definitions must agree before live integration.

## Before using real data

The current entry point generates synthetic data only and its validator rejects real or mixed markers. A separate real-data preparation path still needs to check endpoint evidence, reviewed rep boundaries, measurement quality and participant IDs. These demo artifacts must not be used for live RIR or reported as capstone results.

## Planned pipeline

The input will be one combined table with participant IDs, set IDs, per-rep measurements, and valid RIR labels. A **feature** is an input measurement, such as lifting speed. A **label** is the answer we want the model to learn, such as 2 reps left.

The planned steps are:

1. Check the combined table and exclude demo clips, invalid labels, and unusable measurements.
2. Divide participants into training and evaluation groups. All sets and reps from the same person stay together.
3. Train the speed-only baseline. A **baseline** is the simple model used as a starting comparison.
4. Train a matched model using the same speed inputs plus movement-instability features.
5. Compare both models on the same people they have never seen during training.
6. Save the model, the feature definitions, and the evaluation results if they support use in the web app.

**Training** means learning patterns from examples. **Evaluation** means checking predictions against known answers. We plan to report mean absolute error (MAE): how many reps the prediction is wrong by, on average.

The comparison must be fair. Both models will use the same participants, labels, and evaluation splits. Any data cleaning or scaling that learns from data must be fitted using training participants only. We must not give the model information from the end of a set when that information would be unavailable during a live prediction.

An **experiment setting** records choices such as the features used and which participants belong to each split, so a result can be reproduced.

Generated model files and reports stay under ignored `artifacts/synthetic/`. Research CSVs belong in approved storage or ignored local `data/` directories; videos remain in approved storage. Reports should summarize results without exposing participants' identities.

The current pose model in `../pilot/` already finds body points. The models trained here will have a different job: use the resulting measurements to estimate RIR. We have not established that adding movement instability improves predictions.

Implementation references: [participant-group splitting](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GroupShuffleSplit.html) and [exporting a scikit-learn pipeline to ONNX](https://onnx.ai/sklearn-onnx/pipeline.html).
