import { useEffect, useState } from "react";
import { CurlIllustration } from "../components/CurlIllustration";
import { Icon } from "../components/Icon";
import {
  exerciseGroups,
  exercises,
  type ExerciseGroup,
} from "../content/exercises";

function readSelection() {
  const [, id = "", section] = window.location.hash.slice(1).split("/");
  return {
    id,
    tab: section === "setup" ? ("setup" as const) : ("movement" as const),
  };
}

const cameraSteps: [string, string][] = [
  [
    "Set the phone down",
    "Place your phone on a stable support. Do not hold it while lifting.",
  ],
  [
    "Find your frame",
    "Include your shoulders, elbows and wrists through the whole curl movement.",
  ],
  [
    "Check the light",
    "Choose even lighting and a clear background. Keep other people outside the frame.",
  ],
];

export function Guide() {
  const [selection, setSelection] = useState(readSelection);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<ExerciseGroup>("All");
  useEffect(() => {
    const changed = () => setSelection(readSelection());
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const exercise = exercises.find((item) => item.id === selection.id);

  if (selection.id && !exercise) {
    return (
      <>
        <h1 className="page-title">Guide not found</h1>
        <a href="#guide" className="inline-link mt-6">
          <Icon name="back" />
          Back to exercises
        </a>
      </>
    );
  }

  if (exercise) {
    const cameraTab = exercise.cameraPreview && selection.tab === "setup";
    return (
      <>
        <a className="guide-back" href="#guide">
          <Icon name="back" />
          All exercises
        </a>
        <div className="page-heading">
          <h1 className="page-title">{exercise.name}</h1>
          <p className="description mt-3">{exercise.equipment}</p>
        </div>
        <div className="guide-grid">
          <div className="guide-detail-summary">
            {exercise.cameraPreview && (
              <div className="guide-visual">
                <CurlIllustration />
                <span className="visual-caption">Both arms move together</span>
              </div>
            )}
            <dl className="exercise-facts">
              <div>
                <dt>Focus</dt>
                <dd>{exercise.focus}</dd>
              </div>
              <div>
                <dt>Body area</dt>
                <dd>{exercise.group}</dd>
              </div>
              <div>
                <dt>Equipment</dt>
                <dd>{exercise.equipment}</dd>
              </div>
            </dl>
            {!exercise.cameraPreview && (
              <p className="guide-support-note">
                Guide only. Live tracking is not available for this exercise.
              </p>
            )}
          </div>
          <div>
            {exercise.cameraPreview ? (
              <div className="segmented" aria-label="Guide section">
                <button
                  aria-pressed={!cameraTab}
                  onClick={() =>
                    setSelection({ ...selection, tab: "movement" })
                  }
                >
                  The movement
                </button>
                <button
                  aria-pressed={cameraTab}
                  onClick={() => setSelection({ ...selection, tab: "setup" })}
                >
                  Camera setup
                </button>
              </div>
            ) : (
              <h2 className="guide-subheading">The movement</h2>
            )}
            <ol className="instruction-list">
              {(cameraTab ? cameraSteps : exercise.steps).map(
                ([title, copy], index) => (
                  <li key={title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{copy}</p>
                    </div>
                  </li>
                ),
              )}
            </ol>
            {!cameraTab && (
              <section className="form-tips">
                <h2 className="guide-subheading">Form tips</h2>
                <ul>
                  {exercise.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </section>
            )}
            <a
              className="technique-reference"
              href={exercise.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {exercise.referenceLabel}
              <Icon name="arrow" />
            </a>
            <p className="quiet-note">
              <Icon name="info" />
              Stop if you feel pain. These guides do not replace individual
              coaching.
            </p>
            {exercise.cameraPreview && (
              <a className="primary-button mt-7" href="#live">
                Try curl camera setup
                <Icon name="arrow" />
              </a>
            )}
          </div>
        </div>
      </>
    );
  }

  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = exercises.filter((item) => {
    const text =
      `${item.name} ${item.equipment} ${item.focus} ${item.group}`.toLowerCase();
    return (
      (group === "All" || item.group === group) &&
      terms.every((term) => text.includes(term))
    );
  });
  return (
    <>
      <div className="page-heading">
        <h1 className="page-title">Exercises</h1>
        <p className="description mt-3">
          Find your movement. Get the setup right.
        </p>
      </div>
      <div className="library-search">
        <Icon name="search" />
        <input
          type="search"
          aria-label="Search exercises, equipment or muscles"
          placeholder="Search exercises"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            className="icon-button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            <Icon name="close" />
          </button>
        )}
      </div>
      <div
        className="exercise-filters"
        role="group"
        aria-label="Filter exercises by body area"
      >
        {exerciseGroups.map((item) => (
          <button
            key={item}
            aria-pressed={group === item}
            onClick={() => setGroup(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="library-count" role="status">
        {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
      </div>
      <div className="exercise-library">
        {filtered.map((item) => (
          <a
            className="exercise-list-item"
            key={item.id}
            href={`#guide/${item.id}`}
          >
            <span className="exercise-list-icon">
              <Icon
                name={
                  item.equipment === "No equipment" || item.equipment === "Mat"
                    ? "guide"
                    : "dumbbell"
                }
              />
            </span>
            <div>
              <h2>{item.name}</h2>
              <p>
                {item.group} · {item.equipment}
              </p>
            </div>
            <Icon name="chevron" className="exercise-list-chevron" />
          </a>
        ))}
      </div>
      {filtered.length === 0 && (
        <section className="library-empty">
          <h2>No matching exercises</h2>
          <p>Try another name, piece of equipment or body area.</p>
          <button
            className="text-button"
            onClick={() => {
              setQuery("");
              setGroup("All");
            }}
          >
            Clear filters
          </button>
        </section>
      )}
    </>
  );
}
