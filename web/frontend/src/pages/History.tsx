import { Icon } from "../components/Icon";

export function History({ openAccount }: { openAccount: () => void }) {
  return (
    <>
      <div className="mb-7 lg:mb-8">
        <h1 className="text-[clamp(28px,_4vw,_34px)] leading-[1.08] tracking-[-0.04em] font-medium mt-3">History</h1>
      </div>
      <section className="py-[45px] px-[25px] text-center bg-[#1c1f1a] border border-[#ffffff0d] rounded-[22px]">
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="w-[35px] h-[1px] bg-[#49543f]" />
          <Icon className="size-11 text-[#b6c0aa] p-2.5 box-content rounded-[20px] bg-[#303729]" name="history" />
          <span className="w-[35px] h-[1px] bg-[#49543f]" />
        </div>
        <h2 className="text-2xl tracking-[-0.03em]">No sessions yet.</h2>
        <p className="text-[13px] leading-[1.8] max-w-82.5 mt-3.5 mx-auto mb-6.5 text-muted">
          Once live tracking is ready, your saved sets will appear here. Camera
          previews are not saved as training sessions.
        </p>
        <a href="#live" className="flex items-center justify-center gap-5 min-h-13 rounded-xl py-3.5 px-5 text-[13px] font-semibold w-full bg-accent text-[#22281b] max-w-70 m-auto">
          Explore camera setup
        </a>
      </section>
      <button
        className="flex items-center gap-[15px] p-[21px] bg-surface border border-[#ffffff08] rounded-[18px] mt-6 w-full text-left"
        onClick={openAccount}
      >
        <span className="flex items-center justify-center size-11 rounded-full bg-[#ffffff06]">
          <Icon className="size-5 text-[#b4bdab]" name="user" />
        </span>
        <div>
          <h2 className="font-semibold">Keep your progress with you</h2>
          <p className="text-sm text-muted mt-1">
            Account access is coming next
          </p>
        </div>
      </button>
    </>
  );
}
