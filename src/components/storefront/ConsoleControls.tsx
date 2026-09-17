'use client';

export function ConsoleControls() {
  return (
    <div className="flex items-center justify-between gap-xso-4 border-t border-black/40 px-xso-4 py-xso-4 sm:px-xso-6 sm:py-xso-5">
      <div className="flex items-center gap-xso-3">
        <div
          className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-b from-[#4a515a] to-[#1e2329] shadow-[0_6px_0_#0d1014,inset_0_2px_0_rgba(255,255,255,0.12)] sm:h-16 sm:w-16"
          aria-hidden
        >
          <div className="relative h-8 w-8 sm:h-9 sm:w-9">
            <span className="absolute left-1/2 top-0 h-3 w-2.5 -translate-x-1/2 rounded-sm bg-[#12161b]" />
            <span className="absolute bottom-0 left-1/2 h-3 w-2.5 -translate-x-1/2 rounded-sm bg-[#12161b]" />
            <span className="absolute left-0 top-1/2 h-2.5 w-3 -translate-y-1/2 rounded-sm bg-[#12161b]" />
            <span className="absolute right-0 top-1/2 h-2.5 w-3 -translate-y-1/2 rounded-sm bg-[#12161b]" />
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#2a3138]" />
          </div>
        </div>
        <div className="hidden sm:block">
          <p className="font-pixel text-[7px] uppercase tracking-[0.2em] text-console-mist/45">
            Direction
          </p>
          <p className="mt-1 font-mono text-[10px] text-console-mist/35">
            Scroll carts · Tap to load
          </p>
        </div>
      </div>

      <div className="flex items-center gap-xso-3">
        <div className="flex gap-2" aria-hidden>
          <span className="h-8 w-8 rounded-full bg-gradient-to-b from-[#6ec8ff] to-[#1a6aa8] shadow-[0_4px_0_#0a3a5c,inset_0_1px_0_rgba(255,255,255,0.35)] sm:h-9 sm:w-9" />
          <span className="mt-3 h-8 w-8 rounded-full bg-gradient-to-b from-[#ff8f8f] to-[#b01818] shadow-[0_4px_0_#5c0808,inset_0_1px_0_rgba(255,255,255,0.35)] sm:h-9 sm:w-9" />
        </div>
        <div className="text-right">
          <p className="font-pixel text-[7px] uppercase tracking-[0.2em] text-console-mist/45">
            Action
          </p>
          <p className="mt-1 font-mono text-[10px] text-console-mist/35">
            Start builds XSO
          </p>
        </div>
      </div>
    </div>
  );
}
