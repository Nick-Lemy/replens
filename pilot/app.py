"""A small, local demonstration of the video-to-rep part of the capstone."""

from hashlib import sha256
from pathlib import Path
from tempfile import NamedTemporaryFile
import re

import altair as alt
import pandas as pd
import streamlit as st

from pipeline import analyze_video

st.set_page_config(page_title="RepLens — Curl pilot", page_icon="💪", layout="wide")
st.title("RepLens — Two-arm curl pilot")
st.caption(
    "Upload one clear, uncut set of simultaneous dumbbell curls. Processing happens on this computer."
)

uploaded = st.file_uploader("Choose a video", type=["mp4", "mov", "avi", "webm"])
upload_key = sha256(uploaded.getbuffer()).hexdigest() if uploaded is not None else None
model_choice = st.selectbox(
    "Body-point model",
    ("heavy", "full"),
    format_func=lambda value: (
        "Full (faster)" if value == "full" else "Heavy (slower; compare on your clip)"
    ),
)
st.caption(
    "Try the same clip with both models if the shoulder, elbow, or wrist points jump or disappear."
)
st.info(
    "This prototype detects complete curls and measures arm motion. "
    "It does not predict reps left or prove muscle tremor yet."
)

if uploaded is not None:
    st.video(uploaded, width=420)
    if st.button("Analyze curls", type="primary"):
        if uploaded.size > 150 * 1024 * 1024:
            st.error("Use a video smaller than 150 MB.")
            st.stop()
        temporary_path = None
        try:
            with NamedTemporaryFile(
                suffix=Path(uploaded.name).suffix, delete=False
            ) as temporary:
                temporary.write(uploaded.getbuffer())
                temporary_path = Path(temporary.name)
            with st.spinner(
                "Tracking arms and creating the counted playback. The first run downloads the selected pose model."
            ):
                analysis = analyze_video(temporary_path, model_variant=model_choice)
        except Exception as exc:
            st.error(f"Could not analyze this clip: {exc}")
            st.stop()
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)

        st.session_state["analysis"] = analysis
        st.session_state["upload_key"] = (upload_key, model_choice)

if "analysis" in st.session_state and st.session_state.get("upload_key") == (
    upload_key,
    model_choice,
):
    analysis = st.session_state["analysis"]
    st.subheader("What the computer found")
    st.caption(f"Pose model used: {analysis.model_variant}")
    a, b, c = st.columns(3)
    a.metric("Complete curls", len(analysis.reps))
    b.metric("Both arms visible", f"{analysis.tracked_fraction:.0%} of frames")
    c.metric("Clip analyzed", f"{analysis.duration_s:.1f} seconds")
    st.caption(
        f"Left arm tracked: {analysis.left_tracked_fraction:.0%} of frames. "
        f"Right arm tracked: {analysis.right_tracked_fraction:.0%} of frames."
    )

    st.subheader("Watch the count happen")
    st.video(analysis.annotated_mp4, width=420)
    st.caption(
        "S = shoulder, E = elbow, W = wrist. Blue is the left arm; green is the right arm. "
        "The counter increases only after a complete curl comes back down. "
        "The clip is analyzed first, then replayed with the count aligned to its frames. "
        "Pause or replay where the tracking or count looks wrong."
    )
    st.download_button(
        "Download annotated video",
        analysis.annotated_mp4,
        "curl_count_debug.mp4",
        "video/mp4",
    )

    if min(analysis.left_tracked_fraction, analysis.right_tracked_fraction) < 0.5:
        st.warning(
            "One arm is missing in many frames. Use a front or slight diagonal camera view with both arms visible."
        )
    elif analysis.tracked_fraction < 0.7:
        st.warning(
            "Both arms were not tracked in much of the clip. Try brighter lighting and keep both arms in view."
        )

    st.subheader("Arm bend over time")
    graph = analysis.frames.iloc[::2][
        ["time_s", "left_flexion_smooth", "right_flexion_smooth"]
    ].melt("time_s", var_name="arm", value_name="bend_deg")
    graph["arm"] = graph["arm"].map(
        {"left_flexion_smooth": "Left arm", "right_flexion_smooth": "Right arm"}
    )
    x_axis = alt.X(
        "time_s:Q", title="Seconds", scale=alt.Scale(domain=[0, analysis.duration_s])
    )
    y_axis = alt.Y(
        "bend_deg:Q", title="Elbow bend (degrees)", scale=alt.Scale(domain=[0, 180])
    )
    lines = (
        alt.Chart(graph)
        .mark_line()
        .encode(x=x_axis, y=y_axis, color=alt.Color("arm:N", title="Tracked arm"))
    )
    decisions = analysis.diagnostics.dropna(subset=["time_s"]).copy()
    if not decisions.empty:
        decisions["time_s"] = decisions["time_s"].astype(float)
        decisions["decision"] = decisions["result"].apply(
            lambda value: "Counted" if value.startswith("Counted") else "Rejected"
        )
        points = pd.merge_asof(
            decisions.sort_values("time_s"),
            analysis.frames[["time_s", "mean_flexion"]].sort_values("time_s"),
            on="time_s",
            direction="nearest",
        ).dropna(subset=["mean_flexion"])
        markers = (
            alt.Chart(points)
            .mark_circle(size=110)
            .encode(
                x=x_axis,
                y=alt.Y("mean_flexion:Q"),
                color=alt.Color(
                    "decision:N",
                    title="Peak decision",
                    scale=alt.Scale(
                        domain=["Counted", "Rejected"], range=["#21bd72", "#f06b55"]
                    ),
                ),
                tooltip=[
                    alt.Tooltip("time_s:Q", title="Second", format=".2f"),
                    "result:N",
                ],
            )
        )
        chart = alt.layer(lines, markers).resolve_scale(color="independent")
    else:
        chart = lines
    st.altair_chart(chart, width="stretch")
    st.caption(
        "Each large rise can be a curl. Green dots were counted; orange dots were rejected. Hover over a dot to see why."
    )

    if analysis.reps.empty:
        st.warning(
            "No full two-arm curls passed the checks. Confirm the clip actually shows simultaneous dumbbell curls, with the bottom and top of each rep visible. Bench presses and other exercises are outside this counter."
        )
    else:
        st.subheader("One row for each completed curl")
        st.write("**Identify this set before saving.** Use a code, not a participant's name. Keep the code-to-name list separately.")
        id_col, set_col = st.columns(2)
        with id_col:
            participant_id = st.text_input(
                "Participant ID", placeholder="P001 (or DEMO for an online test clip)",
                key=f"participant_{upload_key}_{model_choice}",
            ).strip().upper()
        with set_col:
            set_id = st.text_input(
                "Set ID", placeholder="S01", key=f"set_{upload_key}_{model_choice}",
            ).strip().upper()
        st.write(
            "**Reps left needs a checked ending.** The video measurements alone cannot tell whether another curl was possible."
        )
        endpoint = st.selectbox(
            "What happened after the last completed curl?",
            (
                "Unknown, or the person stopped without a failed attempt",
                "Another curl was attempted but could not be completed",
            ),
            key=f"endpoint_{upload_key}_{model_choice}",
        )
        count_checked = st.checkbox(
            "I checked that this is the full, uncut set and every completed curl was counted correctly",
            key=f"count_checked_{upload_key}_{model_choice}",
        )
        reps_to_show = analysis.reps.copy()
        verified_failure = endpoint.startswith("Another curl") and count_checked
        if verified_failure:
            reps_to_show["reps_left"] = len(reps_to_show) - reps_to_show["rep"]
            st.success(
                "Reviewer-confirmed failure labels added: the last completed curl has 0 reps left."
            )
        else:
            st.info(
                "Reps left remains blank until a failed next attempt and the complete rep count are both confirmed."
            )
        valid_ids = bool(re.fullmatch(r"P\d{3}|DEMO", participant_id)) and bool(
            re.fullmatch(r"S\d{2}", set_id)
        )
        if valid_ids:
            reps_to_show.insert(0, "set_id", set_id)
            reps_to_show.insert(0, "participant_id", participant_id)
            reps_to_show["rir_label_status"] = (
                "reviewer_confirmed_failure" if verified_failure else "unlabeled"
            )
            reps_to_show["pose_model"] = model_choice
        else:
            st.info("Enter an ID such as P001 or DEMO, and a set ID such as S01, to enable the CSV download.")
        st.dataframe(reps_to_show, hide_index=True, use_container_width=True)
        st.caption(
            "Speed is elbow-angle change per second, not dumbbell metres per second. "
            "Movement instability is an experimental image measure, not a diagnosis of muscle tremor. "
            "Reps left is a checked label, not a prediction from this app."
        )
        if valid_ids:
            csv = reps_to_show.to_csv(index=False).encode("utf-8")
            st.download_button(
                "Download this set's CSV", csv,
                f"{participant_id}_{set_id}_reps.csv", "text/csv",
            )

    st.subheader("Why a possible curl was counted or rejected")
    st.caption(
        "The time is when the possible curl reached its top. The visible counter changes after the arm comes back down."
    )
    if analysis.diagnostics.empty:
        st.write("No possible curl peak was found in this clip.")
    else:
        st.dataframe(analysis.diagnostics, hide_index=True, use_container_width=True)

    with st.expander("How to check this result"):
        st.write(
            "Watch the uploaded video and count only full up-and-down movements where both arms curl together. "
            "Compare your count with the number above. If they differ, the automatic detector needs improvement "
            "for this camera view. Do not treat the displayed measurements as research results yet."
        )
