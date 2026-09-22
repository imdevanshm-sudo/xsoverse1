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

/** Expanded invisible hit areas (~44px) over the visual D-pad nubbins. */
const HIT =
  'absolute z-10 touch-manipulation select-none rounded-md active:bg-white/10 disabled:opacity-40';

/**
 * Bottom hardware deck — sized for thumb reach on mobile.
 * Keep visual chrome modest; hit targets stay ≥44px.
 */
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
  const padNub =
    'pointer-events-none absolute rounded-sm bg-[#12161b] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]';

  return (
    <div className="flex items-center justify-between gap-3 border-t border-black/50 bg-gradient-to-b from-[#1a1c20]/80 to-transparent px-4 py-2.5 sm:gap-xso-4 sm:px-xso-6 sm:py-4">
      <div
        className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-b from-[#3a3d42] to-[#14161a] shadow-[0_5px_0_#08090b,inset_0_2px_0_rgba(255,255,255,0.1)] sm:h-[5.25rem] sm:w-[5.25rem]"
        role="group"
        aria-label="D-pad · cycle cartridges"
      >
        <span
          className={`${padNub} left-1/2 top-1.5 h-3 w-2.5 -translate-x-1/2 sm:top-2 sm:h-3.5 sm:w-3 ${
            pressed.up ? 'bg-[#0a0c0e]' : ''
          }`}
          aria-hidden
        />
        <span
          className={`${padNub} bottom-1.5 left-1/2 h-3 w-2.5 -translate-x-1/2 sm:bottom-2 sm:h-3.5 sm:w-3 ${
            pressed.down ? 'bg-[#0a0c0e]' : ''
          }`}
          aria-hidden
        />
        <span
          className={`${padNub} left-1.5 top-1/2 h-2.5 w-3 -translate-y-1/2 sm:left-2 sm:h-3 sm:w-3.5 ${
            pressed.left ? 'bg-[#0a0c0e]' : ''
          }`}
          aria-hidden
        />
        <span
          className={`${padNub} right-1.5 top-1/2 h-2.5 w-3 -translate-y-1/2 sm:right-2 sm:h-3 sm:w-3.5 ${
            pressed.right ? 'bg-[#0a0c0e]' : ''
          }`}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[#2a2e34] sm:h-2.5 sm:w-2.5"
          aria-hidden
        />

        <button
          type="button"
          className={`${HIT} left-1/2 top-0 h-11 w-11 -translate-x-1/2`}
          aria-label="D-pad up"
          disabled={disabled}
          onClick={onPadUp}
        />
        <button
          type="button"
          className={`${HIT} bottom-0 left-1/2 h-11 w-11 -translate-x-1/2`}
          aria-label="D-pad down"
          disabled={disabled}
          onClick={onPadDown}
        />
        <button
          type="button"
          className={`${HIT} left-0 top-1/2 h-11 w-11 -translate-y-1/2`}
          aria-label="D-pad left · previous cartridge"
          disabled={disabled}
          onClick={onPadLeft}
        />
        <button
          type="button"
          className={`${HIT} right-0 top-1/2 h-11 w-11 -translate-y-1/2`}
          aria-label="D-pad right · next cartridge"
          disabled={disabled}
          onClick={onPadRight}
        />
      </div>

      <div className="flex items-end gap-2.5 sm:gap-3" role="group" aria-label="Action buttons">
        <button
          type="button"
          disabled={disabled}
          onClick={onActionB}
          aria-label="B button · next cartridge"
          className={`flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-gradient-to-b from-[#6ec8ff] to-[#1a6aa8] shadow-[0_4px_0_#0a3a5c,inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_#0a3a5c] disabled:opacity-40 sm:h-11 sm:w-11 ${
            pressed.b ? 'translate-y-1 shadow-[0_2px_0_#0a3a5c]' : ''
          }`}
        >
          <span className="font-pixel text-[9px] text-white/80">B</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onActionA}
          aria-label="A button · press start"
          className={`mb-1 flex h-12 w-12 touch-manipulation items-center justify-center rounded-full bg-gradient-to-b from-[#ff8f8f] to-[#b01818] shadow-[0_4px_0_#5c0808,inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform active:translate-y-1 active:shadow-[0_2px_0_#5c0808] disabled:opacity-40 sm:mb-2 sm:h-12 sm:w-12 ${
            pressed.a ? 'translate-y-1 shadow-[0_2px_0_#5c0808]' : ''
          }`}
        >
          <span className="font-pixel text-[9px] text-white/80">A</span>
        </button>
      </div>
    </div>
  );
}
