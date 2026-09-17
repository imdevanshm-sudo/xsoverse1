'use client';

import dynamic from 'next/dynamic';
import {
  Component,
  memo,
  type ErrorInfo,
  type ReactNode,
  useState,
} from 'react';
import type { XsoData } from '@/types/xso';
import type { R3FUnifiedViewerProps } from '@/components/xso/viewers/R3FUnifiedViewer';
import { PhoneFrame, type PhoneFrameSize } from '@/components/xso/PhoneFrame';
import { useDeviceQuality } from '@/hooks/useDeviceQuality';
import { LiteSouvenirViewer } from '@/components/xso/viewers/LiteSouvenirViewer';

export interface XsoViewerProps {
  data: XsoData;
  initialSide?: number;
  contained?: boolean;
  frameSize?: PhoneFrameSize;
  /** @deprecated Style switching disabled — kept for API compat. */
  showStyleSwitcher?: boolean;
}

const R3FUnifiedViewer = dynamic<R3FUnifiedViewerProps>(
  () =>
    import('@/components/xso/viewers/R3FUnifiedViewer').then(
      (module) => module.R3FUnifiedViewer,
    ),
  { ssr: false, loading: HardwareLoading },
);

/** Renders a single locked souvenir style — no style-switcher chrome.
 *  Loop → letter/scratch · Rewind → VHS · Scrapbook → flat-lay · Accordion → ribbon.
 *  Falls back to 2D lite engines when WebGL is unavailable or the GPU is too weak. */
export const XsoViewer = memo(function XsoViewer({
  data,
  initialSide = 0,
  contained = true,
  frameSize = 'default',
}: XsoViewerProps) {
  const quality = useDeviceQuality();
  const [forceLite, setForceLite] = useState(false);
  const side =
    data.giftStyle === 'loop' && initialSide === 0 ? 3 : initialSide;

  const useLite = quality.prefer2d || forceLite;

  const viewer = (
    <div className="relative h-full w-full overflow-hidden">
      {useLite ? (
        <LiteSouvenirViewer data={data} initialSide={side} />
      ) : (
        <WebGlBoundary onFallback={() => setForceLite(true)}>
          <R3FUnifiedViewer
            key={data.giftStyle}
            data={data}
            initialSide={side}
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
