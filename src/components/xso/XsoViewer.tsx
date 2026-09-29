'use client';

import dynamic from 'next/dynamic';
import {
  Component,
  memo,
  useCallback,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import type { XsoData } from '@/types/xso';
import type { R3FUnifiedViewerProps } from '@/components/xso/viewers/R3FUnifiedViewer';
import { PhoneFrame, type PhoneFrameSize } from '@/components/xso/PhoneFrame';
import { useDeviceQuality } from '@/hooks/useDeviceQuality';
import type { LiteReason } from '@/lib/deviceQuality';
import { LiteSouvenirViewer } from '@/components/xso/viewers/LiteSouvenirViewer';

export interface XsoViewerProps {
  data: XsoData;
  initialSide?: number;
  contained?: boolean;
  frameSize?: PhoneFrameSize;
  /** @deprecated Style switching disabled — kept for API compat. */
  showStyleSwitcher?: boolean;
  /** Stop rendering the 3D canvas (e.g. while checkout is locking). */
  paused?: boolean;
  /** Fires each time the user loops / advances the souvenir. */
  onAdvance?: () => void;
  /** Overlay the scratch-off foil on the stage when the letter is on top. */
  scratchDock?: boolean;
}

const R3FUnifiedViewer = dynamic<R3FUnifiedViewerProps>(
  () =>
    import('@/components/xso/viewers/R3FUnifiedViewer').then(
      (module) => module.R3FUnifiedViewer,
    ),
  { ssr: false, loading: HardwareLoading },
);

/** Renders a single locked souvenir style — no style-switcher chrome.
 *  Capable phones get low-tier 3D; low-end devices, missing WebGL,
 *  Save-Data, ?lite=1, a lost GPU context or a sustained FPS floor
 *  switch to the 2D Lite viewer. */
export const XsoViewer = memo(function XsoViewer({
  data,
  initialSide = 0,
  contained = true,
  frameSize = 'default',
  paused = false,
  onAdvance,
  scratchDock = true,
}: XsoViewerProps) {
  const quality = useDeviceQuality();
  const [runtimeReason, setRuntimeReason] = useState<LiteReason | null>(null);
  const [urlLite, setUrlLite] = useState(false);
  const side =
    data.giftStyle === 'loop' && initialSide === 0 ? 3 : initialSide;

  useEffect(() => {
    setUrlLite(
      new URLSearchParams(window.location.search).get('lite') === '1',
    );
  }, []);

  const fallBackToLite = useCallback(() => {
    setRuntimeReason((current) => current ?? 'no-webgl');
  }, []);

  const fallBackForPerf = useCallback(() => {
    setRuntimeReason((current) => current ?? 'performance');
  }, []);

  const liteReason: LiteReason | null =
    quality.liteReason ?? runtimeReason ?? (urlLite ? 'forced' : null);

  const viewer = (
    <div className="relative h-full w-full overflow-hidden">
      {liteReason ? (
        <LiteSouvenirViewer
          data={data}
          initialSide={side}
          reason={liteReason}
          onAdvance={onAdvance}
        />
      ) : (
        <WebGlBoundary onFallback={fallBackToLite}>
          <R3FUnifiedViewer
            key={data.giftStyle}
            data={data}
            initialSide={side}
            paused={paused}
            onAdvance={onAdvance}
            scratchDock={scratchDock}
            onContextLost={fallBackToLite}
            onPerfFallback={fallBackForPerf}
          />
        </WebGlBoundary>
      )}
    </div>
  );

  if (!contained) return viewer;

  return <PhoneFrame size={frameSize}>{viewer}</PhoneFrame>;
});

function HardwareLoading() {
  return (
    <div className="flex h-full min-h-[320px] w-full items-center justify-center bg-[#10070b] font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
      Loading 3D hardware…
    </div>
  );
}

class WebGlBoundary extends Component<
  { children: ReactNode; onFallback: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[XsoViewer] WebGL path failed; using lite mode', error, info);
    this.props.onFallback();
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full min-h-[320px] w-full items-center justify-center bg-[#10070b] font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
          Switching to lite mode…
        </div>
      );
    }
    return this.props.children;
  }
}

export default XsoViewer;
