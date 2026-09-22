'use client';

interface ConversionBarProps {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  styleTitle?: string;
  price?: string;
}

/** Sticky native conversion bar — replaces arcade Press Start chrome. */
export function ConversionBar({
  onPress,
  disabled = false,
  label = 'Build your XSO',
  styleTitle,
  price,
}: ConversionBarProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      <div className="pointer-events-auto border-t border-white/10 bg-[#0b0f12]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md max-md:backdrop-blur-none sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {styleTitle ? (
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                {styleTitle}
                {price ? ` · ${price}` : ''}
              </p>
            ) : null}
            <p className="mt-0.5 font-mono text-xs text-white/55">
              Customize text, imagery & audio next
            </p>
          </div>
          <button
            type="button"
            onClick={onPress}
            disabled={disabled}
            className="shrink-0 touch-manipulation rounded-full bg-phosphor px-5 py-3.5 font-pixel text-[9px] uppercase tracking-[0.14em] text-[#0a120e] shadow-[0_8px_24px_rgba(157,255,176,0.25)] transition-[transform,opacity] duration-200 enabled:active:scale-[0.98] disabled:cursor-wait disabled:opacity-50 sm:px-7 sm:text-[10px]"
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
