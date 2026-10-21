# Understand the curl project from beginning to end

## The question

We want to know whether an ordinary phone camera can help estimate **repetitions in reserve**, or **RIR**. RIR means: *after this completed curl, how many more complete curls could the person do before the agreed stopping point?*

We will compare two methods:

- **Speed baseline:** use how curl movement changes during a set.
- **Speed + movement method:** use the same speed information and one extra measurement of small, irregular visible movement.

The second method is a **hypothesis**. We have not shown that it works better.

## The whole path

```text
Video → body points → complete reps → measurements → labeled data → models → test on new people
```

### 1. Video

One video should show a complete set of simultaneous two-arm dumbbell curls. An **uncut set** matters because we need to see the beginning, every complete rep, and why the set ended. Frame rate (for example, 30 frames per second) lets us turn movement between images into movement per second.

The current app accepts a recorded video. This choice lets us replay the exact same input while debugging. A later version can process a live camera stream.

### 2. Body points (pose estimation)

**Pose estimation** is a computer vision model that guesses where body joints appear in each image. We use Google's already trained MediaPipe model. It gives us estimated left and right shoulder, elbow, and wrist positions. **Pretrained** means someone else trained this pose model on other data; we are using it, not training it from scratch.

These are estimates, so the app also records when both arms cannot be seen clearly. Dark lighting, an arm hidden behind the body, or camera movement can make the points wrong.

The app offers **Full** and **Heavy** versions of that existing pose model. Heavy is designed for stronger pose accuracy on general benchmarks but takes longer; it is not guaranteed to work better on our curl videos. Run the same clip through both and look at the points and the percentage of frames where both arms were tracked.

The app shows tracking percentages for the left arm, right arm, and both together. A side-view clip may clearly show one arm while hiding the other. In that case the strict two-arm counter may show zero even though one arm is curling; the overlay and percentages reveal why.

We checked a bench-press clip supplied by Nick as a **negative example**. The curl app counted zero, as it should. The clip showed good tracking of one arm and much weaker tracking of the other because of the bench camera view. It cannot tell us whether curl counting is accurate; that needs an actual two-arm curl clip.

A **frame** is one still picture from the video. A **landmark** is one of the body points the pose model predicts in that picture.

### 3. Complete reps (rep detection)

The three points on an arm make an **elbow angle**. When the arm is straight, that angle is large. During a curl, the angle gets smaller. The code converts this to an **elbow bend** value that grows as the dumbbell rises.

The code looks for a bottom → top → bottom pattern. It counts the rep only if both arms show enough movement at about the same time. This is currently a **rule-based algorithm**, not a newly trained curl-counting model. The user does not mark every rep, but we must manually check a few videos to measure how often the rules are right.

The annotated playback shows **S** for shoulder, **E** for elbow, and **W** for wrist on each arm. It shows the detected **LIFTING** or **LOWERING** phase, and adds one to **COUNT** after an accepted rep returns to the bottom. The decision table gives the time and reason when a possible rep is rejected. If the points jump away from the real joints, the pose model is failing. If the points are right but the count is wrong, the rep rules are failing.

The arm-bend graph is the signal the rep counter uses. Each large rise is a possible curl. A green dot shows a counted peak; an orange dot shows a rejected peak. The app checks for a full return to the bottom, enough movement in both arms, and sensible timing. A peak by itself is not always a complete rep.

On one public two-arm curl clip, the first version counted 7 of the 10 large curl cycles. It included waiting time before the first lift and rejected slower late curls because of an eight-second limit. Choosing the bottom just before and after each peak, and allowing slower movements, made the Heavy model count all 10 large cycles on that clip. This is a useful debugging result, not proof that it will count correctly on every person or view.

The upload app analyzes the whole clip before it makes this playback. The moving count lets us inspect the decision at each moment, but it is **not yet a live webcam counter**.

Before looking for that pattern, the code **smooths** the angle curve: it reduces tiny frame-to-frame jumps that may come from imperfect body tracking. It also checks that the elbows do not move too far and the wrists actually rise. These checks can reject a real curl or accept another movement, so they need testing on real clips.

### 4. Measurements (features)

A **feature** is a number we give to a later prediction model. Right now, each detected rep has:

- **Up time:** seconds taken to lift the weights.
- **Curl range:** how many degrees the elbow bend changed.
- **Mean up speed:** curl range divided by up time, in degrees per second.
- **Peak up speed:** the largest short-term change in elbow bend per second.
- **Movement instability:** how much the tracked wrist path wiggles around a smooth path. This is experimental. It may include pose-tracking mistakes or camera shake, so we cannot call it muscle tremor yet.

This process is called **feature extraction**: turn raw video into smaller numbers that a later model can use. The speed here comes from arm angle; it is not yet a physical measurement of the dumbbell in metres per second.

**Normalization** means adjusting a measurement so camera distance has less effect. The experimental instability value divides wrist movement by the visible width between the shoulders. This is useful only when both shoulders are visible and separated enough in the image.

### 5. A table with one row per rep

A **dataset** is a table the model learns from. Every complete rep in every usable set gets a separate row. If one video contains a set of 8 complete reps, it gives 8 rows. Each row needs a participant ID, set ID, rep number, measurements, and eventually a valid answer (label).

The app asks for a participant code such as `P001` and a set code such as `S01` before downloading. The exported file is named `P001_S01_reps.csv`, and **every row** contains both codes. A participant's second set would be `P001_S02_reps.csv`. Do not use real names as IDs. Keep the code-to-name list separately in approved storage. Use `DEMO` for online clips used only to debug the pipeline.

After collection, place the set files in one folder and run `combine_csvs.py`. It joins the 40 small tables into one larger table and checks for duplicated or inconsistent IDs. For example, 20 people × 2 sets × 10 reps would produce about 400 rows. This is called **combining or concatenating data**; it does not train a model. Some rows may still have blank RIR labels and must be reviewed before model training.

Example:

| Person | Set | Rep | Mean up speed | Movement instability | RIR after rep |
|---|---|---:|---:|---:|---:|
| P01 | 1 | 1 | 95 | 0.012 | 7 |
| P01 | 1 | 2 | 91 | 0.014 | 6 |
| P01 | 1 | 8 | 50 | 0.030 | 0 |

Those numbers are invented examples, not results. The app initially leaves RIR blank. After analysis, the reviewer can confirm that the whole set is uncut, every completed curl was counted, and another curl was attempted but could not be completed. Only then does the app fill in the labels, counting backward from 0 for the last completed rep. This is a checked answer supplied by the set ending, **not** an RIR prediction from video movement.

### 6. The correct answer (label)

A **label** or **target** is the answer the prediction model tries to learn. Here it is RIR after each rep. If a person completes 8 reps and then reaches the approved failure endpoint, the labels are 7, 6, 5, 4, 3, 2, 1, 0. If they simply choose to stop after 8, we do not know how many more they could have done, so we cannot assign those labels.

The last completed rep gets **0** only if the person then attempts another rep and cannot complete it under the agreed rules. The final successful rep by itself does not prove that no reps remained. The app asks for explicit confirmation because a wrong automatic count would also make all the backward labels wrong.

The recording and endpoint procedure needs supervisor and ethics approval before collecting volunteers. A set stopped by pain, loss of control, or personal choice must not be treated as a proven failure set.

### 7. Train two models

**Training** means showing a model many labeled examples so it can learn a relationship between measurements and RIR. We will use a simple model because the planned study is small: about 20 volunteers and at most 40 sets.

A **baseline** is the simpler method we compare against. Here it uses speed information. The second model gets exactly the same speed information plus movement-instability features. Both use the same people, labels, and test procedure. That makes the comparison fair.

The MediaPipe pose model and our future RIR model are **different models**. MediaPipe finds body points; the RIR model will use measurements made from those points to predict reps left.

**Supervised learning** means the future RIR model learns from examples that already have the correct answer attached. Without valid RIR labels, we can run the video pipeline but cannot train or fairly score that predictor. **Overfitting** means a model learns quirks of the training examples and fails on new people; participant-held-out testing checks for this problem.

### 8. Test on new people

We must keep all reps from a person together. Some people are used to train the models; other people are used only for testing. A **held-out participant** is someone the models did not see while learning. This helps show whether the method works on a new lifter, rather than merely remembering one person's movement.

We plan to report **mean absolute error (MAE)**. If the real RIR is 3 and the prediction is 5, the absolute error is 2 reps. MAE is the average of those errors. Lower is better. With a small study, a small difference between models may be due to chance, so we will report the number of people and valid sets alongside the score.

## What the code files do

The repository has four main folders. `pilot/` contains this working video-processing demo. `training/` will contain the code that trains and tests the RIR models. `web/` will contain the final user application. `docs/` holds the proposal. The web and training folders currently contain READMEs explaining their planned contents.

- `app.py` builds the upload page, shows the video, starts analysis, and displays the graph and table.
- `pipeline.py` downloads the pose model, reads video frames, finds body points, counts complete reps, and calculates measurements.
- `pipeline.py` also makes the annotated MP4 that reveals what the counter saw at each moment.
- `app.py` marks accepted and rejected peaks on the arm-bend graph and asks for human confirmation before filling RIR labels.
- `requirements.txt` lists the Python libraries needed to run the app.
- `combine_csvs.py` joins the per-set CSV files and checks for duplicate or inconsistent IDs.
- `.gitignore` keeps large videos, model files, and the Python environment out of Git.

In `pipeline.py`, the main functions run in this order:

1. `ensure_model()` gets the pretrained pose model once.
2. `analyze_video()` reads frames and asks MediaPipe for body points.
3. `_landmarks()` extracts shoulders, elbows, and wrists and draws them on a preview frame.
4. `_angle()` calculates elbow angle from those three points.
5. `_smooth()` reduces frame-to-frame noise in the angle signal.
6. `detect_reps()` finds full bottom → top → bottom curls from both arms.
7. `_instability()` measures wrist-path wiggle after subtracting a smooth path.

## What to say in a presentation

> “I have started with the video-processing part. The app takes a curl video, tracks shoulder, elbow, and wrist points with a pretrained computer vision model, detects complete two-arm curls, and makes one row of measurements for each rep. This is not yet a trained reps-left predictor. After ethics approval, I will collect sets with documented endpoints, attach valid RIR labels, and compare a speed-only baseline with speed plus small-movement features on participants the models have never seen.”

## Questions to ask while checking the demo

1. Does the app's count match the number of complete two-arm curls I can see?
2. Do both arm curves rise and fall once for each rep?
3. Does the speed measurement generally drop near the end of this set, or not?
4. Is the camera still, and are both arms visible enough to trust the measurements?
5. Was the set's ending actually verified? If not, leave RIR blank.

## Planned web architecture

React builds the pages the lifter sees. NestJS handles server requests such as login and saving session summaries; both use TypeScript. A **VPS** is a rented server where we can run NestJS, PostgreSQL and Caddy. PostgreSQL stores accounts and saved summaries. **Prisma** is the library our backend uses to read and write those records. **Netlify** hosts the built React app and versioned model files. **Caddy** provides HTTPS for the VPS API and sends API requests to NestJS.

The proposed live processing runs on the phone. A **Web Worker** runs heavier code away from the page so the controls remain responsive. MediaPipe finds body points; our feature code measures each completed rep; **ONNX Runtime Web** runs an exported, trained RIR model. Export means saving a model in a format another runtime can load. We must check that the exported model gives matching answers and works fast enough on real phones. This is planned architecture, not working RIR prediction yet.

Python training remains offline. It compares the two models on unseen people before a suitable model is deployed. See `../web/ARCHITECTURE.md` for the proposed design.

**Docker Compose** describes and starts the server containers together. A container packages a service with its runtime dependencies. Our proposed VPS services are Caddy, NestJS and PostgreSQL. A **Caddyfile** tells Caddy how to serve the app and route API requests. **Better Auth** will manage accounts and login sessions inside NestJS. These are architecture decisions; deployment files have not been created yet.

The React frontend will be hosted on **Netlify**. The browser downloads it and the model files, then runs the proposed live processing on the phone. Account and history requests go to the separate VPS backend. We must configure allowed frontend origins and test login cookies across these deployments. Docker Compose manages the VPS services.

## Frontend and backend starter

`web/frontend/` now contains React + TypeScript pages, styled with Tailwind CSS. **Vite** runs the development server and bundles the app into static files for Netlify. This is **client rendering**: the phone browser draws the interface. We are not using React Router's server framework.

`web/backend/` contains a NestJS starter. A **module** groups a backend feature; a **controller** handles requests. The first module is a health check: `GET /api/health` returns `status: ok` when the API process responds. It does not check a database. The frontend actually requests it and shows whether the backend is reachable.

A **pnpm workspace** lets one repository manage these two JavaScript packages. Run `pnpm install` at the root to install their dependencies. `pnpm dev` starts both development servers. During development, Vite acts as a **proxy**: a browser request to `/api/health` is forwarded to NestJS. Authentication, live tracking and RIR inference have not been implemented in this starter.

**pnpm** is our JavaScript package manager. `pnpm-workspace.yaml` lists the frontend and backend packages. `pnpm install` installs their libraries from the repository root; `pnpm dev` starts both. The lockfile records the exact installed versions so other machines can install the same dependency tree.

## Mobile PWA interface

The frontend now has five pages: Home, Guide, Live, History and Profile. A **PWA** is a website that a supported browser can add to the phone's home screen. A **manifest** describes its name, colours and icons. A **service worker** is separate browser code that can cache public app files, so previously loaded pages can open without a connection. It is different from the future Web Worker that will process movement.

Our camera preview requests video only. It does not record, upload or store footage. Leaving the live page or backgrounding the app stops the camera tracks. The preview has camera switching, a countdown and a timer. These controls do not mean the app can count reps or predict RIR yet. Those fields stay unavailable until the processing pipeline is connected.

Account forms are visual designs only; they do not submit credentials or create accounts. History starts empty. Camera/countdown preferences stay in localStorage, a small browser storage area. The service worker caches only the public interface and icons, not API responses, private records or camera data. See `../web/frontend/README.md` for files, commands and testing limits.

## Mobile interface refinement

Home now focuses on the exercise and next session, with a guide link and recent sessions. Instructions live in the Guide page. We removed decorative badges and large promotional headings. The font is **Sora**, loaded from Google Fonts. If the font cannot load, the browser uses a system fallback. It is not part of the offline app-shell cache in this revision; this avoids adding an unresolved package to the current lockfile. Browser checking remains pending.

## Exercise guide library

The Guide page now includes 14 exercises. Search and body-area filters help users find one, then open its equipment, muscle focus, steps and form tips. The instructions link to technique references. This is educational content, not another trained model.

A **catalog** is a structured list of entries. Our TypeScript catalog gives each exercise a stable ID and its guide content. Only simultaneous two-arm curls link to the current camera preview. Supporting another exercise in live analysis will also require suitable data, a way to measure its movements and evaluation of the resulting predictions. Adding a guide alone does not do that.

## Real exercise photographs

The home card, exercise list and guide detail pages now use photos of people exercising. A separate catalog maps each guide ID to photo URLs and source/license information. Most photos come from Free Exercise DB's open JSON/image collection; the bird-dog photo comes from Wikimedia Commons with author and license links. These are educational pictures, not research examples with RIR labels.

**Lazy loading** means the browser waits to load off-screen pictures until they are needed, reducing work on phones. If a photo cannot load, the app shows a text message rather than a cartoon or an unrelated exercise. Photos are hosted externally; the current service worker caches the app interface, not these pictures. Some photos show a related variation, which is identified in the guide.

### Changing the web app’s appearance

A **Tailwind utility** is a small styling instruction in a component’s `className`. For example, `p-5` adds padding, `bg-accent` uses our shared amber color, and `lg:grid-cols-2` uses two columns on larger screens. Page and component styling now sits beside its JSX instead of in separate named CSS rules.

Edit individual screens in `web/frontend/src/pages/`. Edit shared colors and the font in the `@theme` block of `web/frontend/src/styles.css`. That CSS file contains only the theme and global browser/accessibility rules. See the frontend README’s “Editing the design” section for examples. This is an interface refactor; it adds no pose tracking or RIR model.

### Git hooks and commit labels

A **Git hook** runs a check automatically before a Git action. **Husky** connects our `.husky/` scripts to Git. Our pre-commit hook checks staged whitespace and TypeScript. Our pre-push hook builds the frontend/backend and runs the existing frontend tests. These checks help catch code problems; they do not prove the RIR model is accurate. `pnpm install` activates the hooks when install scripts are enabled; `pnpm hooks:install` activates them manually. Setup is skipped in CI and production builds.

A **Conventional Commit** starts with a short label: `feat` for a feature, `fix` for a bug fix, `refactor` for code cleanup, or `chore` for tooling. For example, `feat(web): add exercise photo guides`.

### Where the proposed model will live

The latest deployment choice puts the exported model file on the Kigali VPS alongside the backend services. Caddy delivers the file to the phone over HTTPS. Netlify serves the React frontend. After loading the model, the phone browser is proposed to run predictions through ONNX Runtime Web. **Hosting** means making the file available for download; **inference** means using the model to calculate a prediction. Storing the file on the VPS does not make inference run there. Compatibility and phone performance still need testing.

For the proposal changes, see `docs/PROPOSAL_REVISION_GUIDE.md`. The proposal's existing title is preserved; the operational measurements are camera-derived speed and movement instability, with RIR as the prediction target. Research ground-truth labels and volunteer videos remain separate from normal app summaries.
## Proposed experiment clarified on 15 October 2026

The final proposal text now specifies **Ridge regression** for the main comparison and **Random Forest regression** for a secondary comparison. These are plans; no RIR predictor has been trained or validated yet.

- Ridge predicts a number using a weighted combination of the inputs. A penalty discourages very large weights, which can help limit fitting to noise.
- A Random Forest averages predictions from several decision trees. A tree follows simple questions about the input measurements to reach a prediction.
- Each algorithm gets two versions: mean/peak lifting speed only, and those same inputs plus movement instability. Both versions must use the same eligible reps and held-out participants.
- Hyperparameters are settings chosen before fitting, such as Ridge's penalty strength or a tree's maximum depth. Choose them using training participants only. The held-out participant is reserved for evaluation.
- The proposed first experiment uses features available by the end of the current rep. It does not use future reps or final set length as inputs.

This clarifies the proposed training stage; it does not change the current pilot's measurements or establish that the combined model is better. See `docs/PROPOSAL_SUBMISSION_TEXT.md` for the proposed grids and source documentation.


## Browser-local live curl counting

This web feature uses two different pieces:

- A **pretrained pose model** finds shoulders, elbows and wrists. Google trained this model already; we are not training it with our volunteer data. Finding joints does not predict fatigue.
- A **state machine** is a small set of rules that remembers the movement stage: arms down, arms lifting, then arms back down. It adds a rep only after both arms complete the required cycle. Visibility, movement range and timing checks help reject incomplete or mismatched movements. These rules are engineering choices, not proof that every count is correct.

A **Web Worker** runs pose processing on a separate browser thread so the interface can stay responsive. The browser sends temporary camera frames to that worker, not to our server. A **timestamp** says when a frame was captured; the counter uses elapsed time to avoid joining movements across tracking gaps.

The backend supplies the pinned pose model and **runtime** files. A runtime is the software needed to execute a model. Here it uses **WebAssembly (WASM)**, a format browsers can run efficiently. The model and runtime files are downloaded to the phone; that does not mean camera frames are uploaded. The service worker does not cache the model/WASM requests under `/api`. The browser's ordinary HTTP cache can reuse these public versioned files; app and worker JavaScript may be cached as part of the public interface. None of those caches stores camera frames.

For a front-facing curl, the forearm can point towards the camera. Its flat image angle can then jump even while the real arm moves smoothly. The live counter therefore uses MediaPipe's **estimated 3D joints** to calculate elbow bend, while image coordinates draw the overlay and check visible wrist movement. Estimated 3D is not a calibrated physical measurement.

This live rule-based counter differs from the Python pilot's whole-video peak detector. Its bend geometry also differs from the pilot's image-plane angles; future RIR training must use the same feature definition as deployment rather than mixing those measurements. It needs its own footage and device checks. A missing pose or model must show an unavailable or repositioning message. The RIR model is still a separate future stage: a rep count alone cannot tell us how many more reps the lifter could do. Live counts are not study ground-truth labels, and this feature does not save video or session history.

Implementation reference: [Google's Pose Landmarker web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).

The pinned SDK also attempts delayed usage-metric requests. RepLens installs a worker-only download policy before importing it: only the local config and versioned public assets are allowed. Production worker responses also restrict connections to the same origin. A 66-second check plus task shutdown verified the worker restriction without relying on that production header. Font and exercise-photo requests elsewhere in the app are separate from camera processing.

## Live counter reliability update

The counter smooths angles using elapsed time: a 220 ms time constant gives comparable smoothing when the browser processes frames at different rates. A single briefly missing pose can be held for up to 250 ms, but it is never counted as a frame; longer loss clears the current movement, and a gap over one second requires extended-arm calibration again. This keeps a short tracking blip from erasing a rep while preventing a hidden full movement from being counted.

Before a set begins, visible preview frames calibrate the extended-arm position without adding reps. Starting a set keeps that calibration only when both arms are still at the bottom; starting during a curl discards the partial movement. A rep must show both arms reaching the top together, wrist rise, limited elbow movement, and a return to the bottom. A short bottom re-arm period prevents one return from starting a second count. The optional tracking details show the runtime version, observed frame rate, estimated arm bend and a plain-language rejection reason.

The user can start the countdown before stepping into camera position. When it reaches zero, the session waits until both arms are visibly extended; the rep counter starts only after that fresh start-position check.

The updated browser counter is `world-full-v2`; older personal summaries keep their `world-full-v1` version and remain readable. These rule changes do not add an RIR predictor, video storage, or research labels. Synthetic tests check multiple frame rates and rejected movements; they do not establish real-world counting accuracy. The pilot detector uses different image-plane geometry and remains a separate pipeline.

The Live page now has an optional, off-by-default synthetic ONNX preview with speed-only and speed-plus-movement-instability choices. Both use only a curl already accepted by the counter; a missing movement feature makes that model's preview unavailable without changing the count. The movement feature follows the pilot's image-plane calculation: wrist x/y relative to each shoulder, divided by shoulder width, with a quadratic trend removed over about 0.4 seconds and the residual variation summarized. Live frame times are irregular, so the browser resamples to a uniform timeline before fitting; this is a pilot-style approximation, not the same captured-video pipeline. The current synthetic movement feature scale (about 0.3) differs substantially from the pilot's observed scale (about 0.006). No scaling is applied to hide that mismatch. The model is explicitly synthetic and not validated; its output is a software-path demonstration, not a validated RIR estimate, exercise advice or training result. It does not establish muscle tremor. Preview values are not saved with personal history, and model errors do not change rep counts.

## Personal session history

A **summary** stores the observed rep count, start/end times and whether the set was interrupted. It does not contain camera footage, body landmarks or RIR. Saving app history does not turn the count into a verified research label.

**Persistence** means keeping that summary in PostgreSQL so it remains available after a page reload. The signed-in account owns it; the API checks ownership whenever someone views or deletes a summary. Browser memory can hold an unsaved draft temporarily, but it disappears when the page is left or reloaded.

An **idempotent save** prevents duplicate entries when a connection fails. Each draft gets one unique request ID. Sending the same draft again returns the existing summary; reusing its ID with different details is rejected. The app must show “saved” only after the server confirms success.

A database **cascade** removes related records automatically. Deleting a RepLens account also deletes its saved workout summaries. These personal records remain separate from consented study videos and participant labels.

## Training folder scaffold

`training/` now separates data preparation, feature calculations, model training, evaluation and ONNX export. A **scaffold** is an empty starting structure, not a working model. Experiment settings belong in `configs/`; optional notebooks belong in `notebooks/`. Local research tables in `training/data/` and generated results in `training/artifacts/` are ignored by Git. The six available videos can support an initial experiment, but participant-held-out testing still requires different people for training and testing, and exact RIR requires valid endpoint evidence.

## Trying the training pipeline with synthetic data

**Synthetic data** means invented examples. `training/run.py` generates invented measurements, trains two small models and exports them to ONNX. This checks that the steps connect correctly. It does not show that we can predict a real lifter's RIR. The current command cannot load study data. Invented people use `SYN` IDs so they cannot be mistaken for volunteers.

The generator makes speed loosely related to invented reps left, with random differences between invented people and sets. Instability is generated independently, without building in an advantage for the second model. A model can learn the generator's rules; that is not evidence about muscle fatigue. These are synthetic feature rows, not synthetic videos, so this run does not check MediaPipe or rep counting.

A **seed** is a number that makes a random experiment repeatable. The same seed and settings create the same rows and participant split. A **held-out participant** is someone whose rows were kept out of training. Both models are tested on the same held-out invented people.

**StandardScaler** puts different inputs on comparable scales by using the training rows' averages and spreads. It reuses those same values for test rows. Fitting it on the test rows would leak information from the test into training. A scikit-learn **Pipeline** joins scaling and prediction so they stay together.

**Ridge regression** learns a weighted formula linking measurements to a number. It discourages overly large weights. Its **alpha** setting controls that penalty; this demo fixes it at 1 rather than searching for a setting on test results. The speed-only model gets two angular-speed inputs. The second gets the same two inputs plus movement instability. Neither gets participant ID, rep number or the set's final length as a prediction input.

The **median reference** always predicts the middle training RIR value. It checks whether learning measurements helps compared with always saying the same number. **MAE**, or mean absolute error, is the average distance between predicted and known answers: a prediction of 4 when the answer is 2 has an error of 2 reps. The report includes an overall average and a separate average per held-out person. Synthetic scores are debugging numbers, not accuracy claims.

**ONNX** is a file format for moving a trained model between runtimes. **ONNX Runtime** executes that file. A **parity check** compares its predictions with the original Python model's predictions; small floating-point differences are normal. This run checks the CPU runtime, not the phone browser. Each **model contract** lists the required feature order, units, input shape and included scaling. Its synthetic status explicitly says it is not approved for deployment. Python's joblib file is another saved-model format; only load files you created or trust.

A **dataset hash** is a fingerprint of the generated CSV. The run record saves that fingerprint, settings, software versions and participant IDs so the experiment can be traced. For real data, the input calculations still need to match the live browser: pilot image-plane angular measurements cannot simply be assumed equivalent to the app's world-landmark measurements.
