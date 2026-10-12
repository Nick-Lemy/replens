# RepLens curl movement pilot

This is the first working step of the capstone: **video → body points → automatic curl detection → movement measurements**. It is a local upload app. It does not yet predict repetitions in reserve (RIR).

## Run it

From the repository root, use Python 3.12 on the Mac:

```bash
uv venv --python python3.12 .venv
uv pip install --python .venv/bin/python -r pilot/requirements.txt
.venv/bin/streamlit run pilot/app.py --server.address localhost --server.headless true --browser.gatherUsageStats false
```

Install `ffmpeg` if it is not already available (`brew install ffmpeg` on macOS). Open `http://localhost:8501`, upload a short, uncut MP4 or MOV of a person curling **both dumbbells at once**, and click **Analyze curls**. Keep the camera still and both arms in view. Choose **Full** or **Heavy** for the existing MediaPipe pose model. The first run of each choice downloads that model into `models/`.

The app produces an annotated playback with shoulder, elbow, and wrist points, arm lines, elbow bend values, lift/lower phase, and a counter that changes when a complete rep ends. Its bend-over-time graph marks counted and rejected peaks; the decision table explains the rejections. The app also offers a CSV with one row per accepted curl. Uploaded video is put in a temporary file for processing and deleted afterward. The model files are cached locally. Videos and the model folder are ignored by Git.

## Save and combine set data

After reviewing the count, enter a participant code such as `P001` and a set code such as `S01`. Use `DEMO` for public test clips; do not mix those with volunteer data. Download the CSV, which will be named `P001_S01_reps.csv`. Every row includes those IDs, the rep number, measurements, and whether the RIR label was confirmed by a reviewer. Keep the separate code-to-name list outside this project, in approved storage.

Put the set CSVs in `pilot/data/sets/`. When you have multiple sets, run from the repository root:

```bash
.venv/bin/python pilot/combine_csvs.py pilot/data/sets
```

This creates `pilot/data/sets/combined_reps.csv`, one table with every rep from every set. The script checks the IDs, file names, rep numbers, label status, and duplicate rows. It refuses demo files. Keep unlabeled rows in the combined table for tracking and review; only valid labeled rows should later enter RIR model training.

## What is ready

- Video upload and local processing.
- Two pretrained pose-estimation choices (Full and Heavy) for shoulder, elbow, and wrist points.
- Automatic detection of complete simultaneous curls using both arms.
- An annotated playback and a table of counting decisions for debugging.
- Per-rep elbow-angle speed and an experimental movement-instability measure.
- A downloadable table of measured reps.
- Participant and set IDs on every exported row, plus a script to combine set CSVs.
- Optional RIR labels when a reviewer confirms the full uncut set, the complete-rep count, and a failed attempt after the final successful rep. These are checked labels, not model predictions.

## What is still needed

- Check automatic counts against several real curl videos and improve the rules when they fail.
- Finalize the approved exercise endpoint and collect consented volunteer videos **after ethics approval**.
- Apply the supervisor-approved endpoint rule to consented volunteer sets before using any RIR labels for training.
- Train a speed-only baseline and a matched speed-plus-movement model; evaluate by held-out participant.
- Consider live camera input once the recorded-video pipeline is reliable.

The small-movement value is **not confirmed muscle tremor**. The speed is an elbow-angle change per second, **not** calibrated dumbbell speed in metres per second. See [LEARN.md](LEARN.md) for a plain-English explanation of every stage and the ML terms.

The code has been checked with a controlled three-rep movement signal and a public simultaneous-curl clip. On that clip, the Heavy model now detects the ten large curl cycles visible in the bend graph. The Full model is less stable on that example. One clip is not enough to establish counting accuracy across people and camera views.

## Existing tools we checked

MediaPipe supplies the pretrained body-point models used here. We also found [WorkoutVision](https://github.com/david-dabert/workout-vision), an open-source workout counter with a live camera option and annotated replay. Its author reports exact counts on two labeled biceps-curl sets (5/5 and 7/7). That is useful as a comparison demo, but two sets do not establish accuracy on our simultaneous two-arm recording setup. A side-view demo clip from that project hides one arm, so this project's strict two-arm counter correctly treats it as unsuitable for a complete two-arm count.
