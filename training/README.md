# Model training and evaluation

This folder will contain the code that learns to estimate reps left from the measurements in our CSV files. It is currently a placeholder; no RIR model has been trained yet.

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

This folder will eventually hold data-checking scripts, training scripts, evaluation scripts, and experiment settings. An **experiment setting** records choices such as the features used and which participants belong to each split, so a result can be reproduced.

Model files will go in an ignored `models/` directory when needed. Research CSVs and videos belong in approved storage or ignored local `data/` directories. Reports should summarize results without exposing participants' identities.

The current pose model in `../pilot/` already finds body points. The models trained here will have a different job: use the resulting measurements to estimate RIR. We have not established that adding movement instability improves predictions.
