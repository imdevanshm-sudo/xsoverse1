'use client';

interface PressStartButtonProps {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
}

export function PressStartButton({
  onPress,
  disabled = false,
  label = 'PRESS START / BUILD XSO',
}: PressStartButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className="group relative mx-auto block w-full max-w-sm touch-manipulation overflow-hidden rounded-full border-[3px] border-[#2a1010] bg-gradient-to-b from-[#ff5a5a] via-[#e01818] to-[#8a0c0c] px-6 py-3.5 shadow-[0_8px_0_#4a0808,0_14px_28px_rgba(0,0,0,0.55),inset_0_2px_0_rgba(255,255,255,0.35)] transition-[transform,box-shadow,opacity] duration-200 ease-xso will-change-transform enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_10px_0_#4a0808,0_18px_32px_rgba(0,0,0,0.6),inset_0_2px_0_rgba(255,255,255,0.4)] enabled:active:translate-y-1 enabled:active:shadow-[0_4px_0_#4a0808,0_8px_16px_rgba(0,0,0,0.45)] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="pointer-events-none absolute inset-0 animate-arcade-glow bg-[radial-gradient(circle_at_50%_30%,rgba(255,220,180,0.45),transparent_55%)]" />
      <span className="relative z-10 block font-pixel text-[10px] uppercase leading-relaxed tracking-[0.18em] text-[#fff4e8] drop-shadow-[0_2px_0_rgba(0,0,0,0.55)] sm:text-[11px]">
        <span className="animate-blink">{label}</span>
      </span>
    </button>
  );
}
