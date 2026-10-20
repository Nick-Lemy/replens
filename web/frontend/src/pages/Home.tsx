import { ExercisePhoto } from "../components/ExercisePhoto";
import { Icon } from "../components/Icon";
import { useExerciseCatalog } from "../features/exercises/useExerciseCatalog";
import { RecentSessions } from "../features/sessions/RecentSessions";

export function Home() {
  const { catalog, loading, error, loadCatalog } = useExerciseCatalog();
  const curl = catalog?.items.find((item) => item.id === "two-arm-dumbbell-curl") ?? null;
  const guideUnavailable = !loading && !error && catalog !== null && !curl;

  return (
    <>
      <div className="mb-5.5 lg:mb-8 sm:max-w-130 sm:ml-auto sm:mr-auto">
        <h1 className="text-[clamp(28px,4vw,34px)] leading-[1.08] tracking-[-0.04em] font-semibold mt-0">
          Let’s train.
        </h1>
        <p className="text-muted text-[13px] leading-[1.75] mt-2">
          Ready for your next set?
        </p>
      </div>

      <section
        className="overflow-hidden rounded-[22px] bg-[#20231f] sm:max-w-130 sm:ml-auto sm:mr-auto"
        aria-labelledby="workout-title"
      >
        <a
          className="h-[clamp(190px,50vw,260px)] flex items-end justify-center overflow-hidden bg-[#c8b48d] sm:h-77.5"
          href="#live"
          aria-label="Set up a biceps curl session"
        >
          <ExercisePhoto
            photos={curl?.photos ?? null}
            alt="A person performing a standing dumbbell biceps curl"
            priority
          />
        </a>
        <div className="p-5.5">
          <div className="flex items-center justify-between gap-3 mb-5.25">
            <div>
              <h2
                className="text-[21px] leading-[1.2] font-semibold tracking-[-0.045em]"
                id="workout-title"
              >
                {curl?.name ?? (error || guideUnavailable ? "Curl guide unavailable" : "Loading curl guide…")}
              </h2>
              <p className="text-xs text-muted mt-2">
                {curl ? `${curl.group} · ${curl.equipment}` : "Exercise guide and photo"}
              </p>
            </div>
            <Icon className="size-6.25 text-[#a5af99]" name="dumbbell" />
          </div>
          <a
            className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b]"
            href="#live"
          >
            Start live session
          </a>
          <p className="text-[10px] leading-[1.6] text-[#b2b9a9] mt-3.25">
            Counts completed two-arm curls during live sessions. Reps-left
            estimates are not available.
          </p>
          {(error || guideUnavailable) && (
            <div className="mt-3 text-xs text-muted" role="status">
              <p>{error || "The curl guide is not available right now."}</p>
              <button className="min-h-11 mt-1 text-accent underline-offset-4 hover:underline" onClick={() => void loadCatalog(true)}>Retry guide</button>
            </div>
          )}
        </div>
      </section>

      <a
        className="flex items-center gap-3.5 mt-4.5 pt-4.25 px-0.5 pb-5.5 border-b border-b-[#ffffff12] sm:max-w-130 sm:ml-auto sm:mr-auto"
        href="#guide/two-arm-dumbbell-curl"
      >
        <span className="flex items-center justify-center size-11 rounded-full bg-[#ffffff06]">
          <Icon className="size-5 text-[#b4bdab]" name="guide" />
        </span>
        <div>
          <h2 className="text-[13px] font-medium">Curl guide</h2>
          <p className="text-[11px] text-muted mt-1.5">
            Movement and camera setup
          </p>
        </div>
        <Icon name="chevron" className="ml-auto size-5" />
      </a>

      <RecentSessions />
    </>
  );
}
