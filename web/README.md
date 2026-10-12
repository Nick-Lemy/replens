# RepLens web application

This folder will contain the web application people use to record or upload a curl set and see its results. It is currently a placeholder; the working Streamlit demo lives in `../pilot/`.

The planned parts are:

- Pages for uploading a video and, later, using a live camera.
- Video playback with arm tracking and a rep counter.
- Results showing movement measurements and, if testing supports it, estimated reps left.
- Server code that runs the video pipeline and loads a tested RIR model.
- Clear messages when tracking is poor or a prediction cannot be trusted.

The web app will use the same feature calculations used during model training. For example, if the model learns from elbow-angle speed, the app must calculate that speed in the same way.

**Inference** means using a trained model to make a prediction on a new input. The app will perform inference; training happens separately in `../training/` before a model is added to the app.

The revised proposal does not specify a final web framework. We will choose that stack when implementation starts. Frontend pages and server logic can live together here as one application. Keeping everything in one repository helps us update the app and model code together.

Before building the full app, we need a reliable video pipeline and an evaluation showing what the RIR model can and cannot do.
