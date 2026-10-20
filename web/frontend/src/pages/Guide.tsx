import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExerciseGallery, ExercisePhoto, PhotoCredit } from "../components/ExercisePhoto";
import { Icon } from "../components/Icon";
import { useExerciseCatalog } from "../features/exercises/useExerciseCatalog";
import { ExerciseApiError, fetchExerciseGuide } from "../features/exercises/api";
import type { ExerciseGroup } from "../features/exercises/types";

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
  const { catalog, loading: catalogLoading, error: catalogError, loadCatalog } = useExerciseCatalog(!selection.id);
  useEffect(() => {
    const changed = () => setSelection(readSelection());
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  const detailQuery = useQuery({
    queryKey: ["public", "exercise-guide", selection.id],
    queryFn: ({ signal }) => fetchExerciseGuide(selection.id, signal),
    enabled: Boolean(selection.id),
    staleTime: 5 * 60_000,
  });
  const exercise = detailQuery.data;
  const detailNotFound = detailQuery.error instanceof ExerciseApiError && detailQuery.error.status === 404;
  const visibleDetailStatus = !selection.id ? "idle" : detailQuery.isPending ? "loading" : detailQuery.isError ? detailNotFound ? "not-found" : "unavailable" : "ready";

  if (selection.id && visibleDetailStatus === "not-found") {
    return (
      <>
        <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-3">
          Guide not found
        </h1>
        <a
          href="#guide"
          className="inline-flex items-center gap-3.5 text-xs font-semibold text-accent mt-6"
        >
          <Icon className="size-4.5" name="back" />
          Back to exercises
        </a>
      </>
    );
  }

  if (selection.id && visibleDetailStatus === "unavailable") {
    return (
      <>
        <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-3">
          Guide unavailable
        </h1>
        <p className="text-muted text-sm leading-[1.75] mt-3" role="alert">
          {navigator.onLine ? "This exercise guide could not be loaded. Try again." : "You’re offline. Reconnect to load this exercise guide."}
        </p>
        <button className="min-h-11 mt-4 text-xs text-accent underline-offset-4 hover:underline" onClick={() => void detailQuery.refetch()}>Retry</button>
        <a href="#guide" className="block min-h-11 mt-2 text-xs text-muted underline-offset-4 hover:underline">Back to exercises</a>
      </>
    );
  }

  if (selection.id && visibleDetailStatus === "loading") {
    return (
      <>
        <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-3">Loading exercise guide…</h1>
        <a href="#guide" className="block min-h-11 mt-4 text-xs text-muted underline-offset-4 hover:underline">Back to exercises</a>
      </>
    );
  }

  if (exercise) {
    const cameraTab = exercise.cameraPreview && selection.tab === "setup";
    return (
      <>
        <a
          className="inline-flex items-center gap-2.5 min-h-11 text-xs text-[#b5bdad] -mt-2.25 mx-0 mb-3.25"
          href="#guide"
        >
          <Icon className="size-4.5" name="back" />
          All exercises
        </a>
        <div className="mb-7 lg:mb-8">
          <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-3">
            {exercise.name}
          </h1>
          <p className="text-muted text-sm leading-[1.75] mt-3">
            {exercise.equipment}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-[0.9fr_1.1fr] sm:gap-7">
          <div className="grid gap-4.5 content-start">
            <ExerciseGallery
              key={exercise.id}
              photos={exercise.photos}
              name={exercise.name}
            />
            <dl className="grid gap-5 bg-[#20231e] p-6 rounded-[17px]">
              <div>
                <dt className="text-[10px] text-muted mb-2">Focus</dt>
                <dd className="text-[13px] leading-[1.65]">{exercise.focus}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted mb-2">Body area</dt>
                <dd className="text-[13px] leading-[1.65]">{exercise.group}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted mb-2">Equipment</dt>
                <dd className="text-[13px] leading-[1.65]">
                  {exercise.equipment}
                </dd>
              </div>
            </dl>
            {!exercise.cameraPreview && (
              <p className="text-xs leading-[1.8] text-muted py-0 px-0.75">
                Guide only. Live tracking is not available for this exercise.
              </p>
            )}
          </div>
          <div>
            {exercise.cameraPreview ? (
              <div
                className="flex gap-1.25 p-1.25 bg-surface rounded-xl"
                aria-label="Guide section"
              >
                <button
                  className="flex-1 min-h-11 rounded-lg text-xs text-muted aria-pressed:bg-[#353a2f] aria-pressed:text-foreground"
                  aria-pressed={!cameraTab}
                  onClick={() =>
                    setSelection({ ...selection, tab: "movement" })
                  }
                >
                  The movement
                </button>
                <button
                  className="flex-1 min-h-11 rounded-lg text-xs text-muted aria-pressed:bg-[#353a2f] aria-pressed:text-foreground"
                  aria-pressed={cameraTab}
                  onClick={() => setSelection({ ...selection, tab: "setup" })}
                >
                  Camera setup
                </button>
              </div>
            ) : (
              <h2 className="text-[15px] font-medium">The movement</h2>
            )}
            <ol className="grid list-none gap-6 mt-7">
              {(cameraTab ? cameraSteps : exercise.steps).map(
                ([title, copy], index) => (
                  <li className="flex gap-4.5" key={title}>
                    <span className="text-[11px] text-accent pt-0.75">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-[15px] font-medium">{title}</h3>
                      <p className="text-[13px] leading-[1.7] text-muted mt-1.75">
                        {copy}
                      </p>
                    </div>
                  </li>
                ),
              )}
            </ol>
            {!cameraTab && (
              <section className="mt-7.5 pt-5.5 border-t border-t-[#ffffff12]">
                <h2 className="text-[15px] font-medium">Form tips</h2>
                <ul className="mt-3.75 pl-4 list-disc grid gap-3 text-muted text-xs leading-[1.8]">
                  {exercise.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </section>
            )}
            <a
              className="inline-flex items-center gap-2.5 text-[11px] leading-[1.7] text-[#c5cdba] mt-6.25 min-h-11"
              href={exercise.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {exercise.referenceLabel}
            </a>
            <p className="flex items-start gap-2.5 text-[11px] text-muted leading-[1.7] mt-6.25">
              <Icon className="size-4 mt-0.5" name="info" />
              Stop if you feel pain. These guides do not replace individual
              coaching.
            </p>
            {exercise.cameraPreview && (
              <a
                className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b] mt-7"
                href="#live"
              >
                Try curl camera setup
              </a>
            )}
          </div>
        </div>
      </>
    );
  }

  if (catalogLoading || !catalog) {
    return (
      <>
        <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-3">
          {catalogError ? "Exercise guides unavailable" : "Loading exercises…"}
        </h1>
        {catalogError ? (
          <>
            <p className="text-muted text-sm leading-[1.75] mt-3" role="alert">
              {!navigator.onLine ? "You’re offline. Reconnect to load exercise guides." : catalogError}
            </p>
            <button className="min-h-11 mt-4 text-xs text-accent underline-offset-4 hover:underline" onClick={() => void loadCatalog(true)}>Retry</button>
          </>
        ) : <p className="text-muted text-sm mt-3" role="status">Loading exercise guides from the API…</p>}
      </>
    );
  }

  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = catalog.items.filter((item) => {
    const text =
      `${item.name} ${item.equipment} ${item.focus} ${item.group}`.toLowerCase();
    return (
      (group === "All" || item.group === group) &&
      terms.every((term) => text.includes(term))
    );
  });
  return (
    <>
      <div className="mb-7 lg:mb-8">
        <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-3">
          Exercises
        </h1>
        <p className="text-muted text-sm leading-[1.75] mt-3">
          Find your movement. Get the setup right.
        </p>
      </div>
      <div className="flex items-center gap-3 py-0 px-3.75 min-h-13 rounded-[13px] bg-[#242820] focus-within:outline-2 focus-within:outline-accent focus-within:outline-offset-3">
        <Icon className="size-4.75 text-muted" name="search" />
        <input
          className="min-w-0 flex-1 py-3.5 px-0 text-base bg-transparent outline-none placeholder:text-[#929b87]"
          type="search"
          aria-label="Search exercises, equipment or muscles"
          placeholder="Search exercises"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            className="w-9 h-11 inline-flex items-center justify-center bg-transparent border-0 rounded-full"
            aria-label="Clear search"
            onClick={() => setQuery("")}
          >
            <Icon className="size-4.75" name="close" />
          </button>
        )}
      </div>
      <div
        className="flex gap-5.75 overflow-x-auto mt-4.5 mx-0 mb-0 border-b border-b-[#ffffff12] scrollbar-thin"
        role="group"
        aria-label="Filter exercises by body area"
      >
        {catalog.groups.map((item) => (
          <button
            className="shrink-0 min-h-11.5 text-xs py-2.5 px-px border-b-2 border-b-transparent text-muted aria-pressed:border-accent aria-pressed:text-accent"
            key={item}
            aria-pressed={group === item}
            onClick={() => setGroup(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="text-muted text-[11px] mt-5.25 mx-0 mb-3.5" role="status">
        {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 md:gap-3.25">
        {filtered.map((item) => (
          <a
            className="flex items-center gap-3.75 min-h-22.25 p-4 bg-[#20231e] rounded-[15px] hover:bg-[#292e24]"
            key={item.id}
            href={`#guide/${item.id}`}
          >
            <ExercisePhoto photos={item.photos} alt="" variant="thumbnail" />
            <div className="min-w-0">
              <h2 className="text-[13px] font-medium leading-normal">
                {item.name}
              </h2>
              <p className="text-[10px] leading-[1.6] text-muted mt-1.25">
                {item.group} · {item.equipment}
              </p>
            </div>
            <Icon name="chevron" className="size-4.5 ml-auto text-[#b0b8a4]" />
          </a>
        ))}
      </div>
      {filtered.some((item) => item.id === "bird-dog") && (
        <div className="mt-5.75">
          <PhotoCredit
            photos={catalog.items.find((item) => item.id === "bird-dog")?.photos ?? null}
            prefix="Bird-dog photo"
            note="Thumbnail resized and cropped."
          />
        </div>
      )}
      {filtered.length === 0 && (
        <section className="py-8.75 px-5 text-center border border-[#ffffff12] rounded-2xl">
          <h2 className="text-[17px]">No matching exercises</h2>
          <p className="text-xs leading-[1.8] text-muted my-3.5 mx-0">
            Try another name, piece of equipment or body area.
          </p>
          <button
            className="text-[#c9d0bf] text-xs p-2.5 underline-offset-4 hover:underline"
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
