# RepLens

Camera-based curl analysis and research into estimating reps left.

This repository will hold the capstone's web app, video-processing code, and ML models together. The research question is whether visible small-movement measurements improve estimates of reps left during simultaneous two-arm dumbbell curls beyond a speed-only baseline.

## Current structure

```text
pilot/    Video upload and rep-counting prototype, its learning guide, and CSV tools
web/      Planned web application: recording, playback, and prediction results
training/ Planned model training and evaluation
docs/     Project proposal
```

The current prototype is in [pilot/README.md](pilot/README.md). It counts curls and extracts movement measurements; it does not have a trained RIR predictor. Volunteer collection is planned only after ALU ethics approval, gym permission, and consent.

[web/README.md](web/README.md) explains the planned application. [training/README.md](training/README.md) explains how we will train and compare the RIR models. Those two folders currently contain documentation only.

Local model files, videos, set CSVs, and the Python environment are excluded from version control. Keep the participant code-to-name list separately in approved storage.
