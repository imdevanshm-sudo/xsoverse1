'use client';

interface ConsoleControlsProps {
  onPadLeft?: () => void;
  onPadRight?: () => void;
  onPadUp?: () => void;
  onPadDown?: () => void;
  onActionA?: () => void;
  onActionB?: () => void;
  disabled?: boolean;
  pressed?: {
    left?: boolean;
    right?: boolean;
    up?: boolean;
    down?: boolean;
    a?: boolean;
    b?: boolean;
  };
}

export function ConsoleControls({
  onPadLeft,
  onPadRight,
  onPadUp,
  onPadDown,
  onActionA,
  onActionB,
  disabled = false,
  pressed = {},
}: ConsoleControlsProps) {
  const padBtn =
    'absolute grid place-items-center rounded-sm bg-[#12161b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform active:translate-y-px disabled:opacity-40';

  return (
    <div className="flex items-center justify-between gap-xso-4 border-t border-black/50 bg-gradient-to-b from-[#1a1c20]/80 to-transparent px-xso-4 py-xso-4 sm:px-xso-6 sm:py-xso-5">
      <div className="flex items-center gap-xso-3">
        <div
          className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-b from-[#3a3d42] to-[#14161a] shadow-[0_6px_0_#08090b,inset_0_2px_0_rgba(255,255,255,0.1)] sm:h-[4.5rem] sm:w-[4.5rem]"
          role="group"
          aria-label="D-pad · cycle cartridges"
        >
          <button
            type="button"
            className={`${padBtn} left-1/2 top-1 h-3.5 w-3 -translate-x-1/2 ${
              pressed.up ? 'translate-y-px bg-[#0a0c0e]' : ''
            }`}
            aria-label="D-pad up"
            disabled={disabled}
            onClick={onPadUp}
          />
          <button
            type="button"
            className={`${padBtn} bottom-1 left-1/2 h-3.5 w-3 -translate-x-1/2 ${
              pressed.down ? 'translate-y-px bg-[#0a0c0e]' : ''
            }`}
            aria-label="D-pad down"
            disabled={disabled}
            onClick={onPadDown}
          />
          <button
            type="button"
            className={`${padBtn} left-1 top-1/2 h-3 w-3.5 -translate-y-1/2 ${
              pressed.left ? 'translate-y-px bg-[#0a0c0e]' : ''
            }`}
            aria-label="D-pad left · previous cartridge"
            disabled={disabled}
            onClick={onPadLeft}
          />
          <button
            type="button"
            className={`${padBtn} right-1 top-1/2 h-3 w-3.5 -translate-y-1/2 ${
              pressed.right ? 'translate-y-px bg-[#0a0c0e]' : ''
            }`}
            aria-label="D-pad right · next cartridge"
            disabled={disabled}
            onClick={onPadRight}
          />
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#2a2e34]"
            aria-hidden
          />
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="font-pixel text-[7px] uppercase tracking-[0.2em] text-console-mist/45">
            Direction
          </p>
          <p className="mt-1 font-mono text-[10px] leading-snug text-console-mist/35">
            ← → cycle carts
          </p>
        </div>
      </div>

      <div className="flex items-center gap-xso-3">
        <div className="flex gap-2" role="group" aria-label="Action buttons">
          <button
            type="button"
            disabled={disabled}
            onClick={onActionB}
            aria-label="B button"
            className={`h-9 w-9 rounded-full bg-gradient-to-b from-[#6ec8ff] to-[#1a6aa8] shadow-[0_4px_0_#0a3a5c,inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_#0a3a5c] disabled:opacity-40 sm:h-10 sm:w-10 ${
              pressed.b ? 'translate-y-1 shadow-[0_2px_0_#0a3a5c]' : ''
            }`}
          >
            <span className="font-pixel text-[8px] text-white/80">B</span>
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onActionA}
            aria-label="A button · press start"
            className={`mt-3 h-9 w-9 rounded-full bg-gradient-to-b from-[#ff8f8f] to-[#b01818] shadow-[0_4px_0_#5c0808,inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_#5c0808] disabled:opacity-40 sm:h-10 sm:w-10 ${
              pressed.a ? 'translate-y-1 shadow-[0_2px_0_#5c0808]' : ''
            }`}
          >
            <span className="font-pixel text-[8px] text-white/80">A</span>
          </button>
        </div>
        <div className="min-w-0 text-right">
          <p className="font-pixel text-[7px] uppercase tracking-[0.2em] text-console-mist/45">
            Action
          </p>
          <p className="mt-1 font-mono text-[10px] leading-snug text-console-mist/35">
            A / Start boots cart
          </p>
        </div>
      </div>
    </div>
  );
}
