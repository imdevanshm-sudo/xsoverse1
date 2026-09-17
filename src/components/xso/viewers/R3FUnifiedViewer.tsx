'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import {
  Center,
  ContactShadows,
  Float,
  PresentationControls,
} from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AdditiveBlending,
  Group,
  MathUtils,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import type { GiftStyle, XsoData } from '@/types/xso';
import { buildMemoryTextureUrls } from '@/lib/loopTextures';
import { useDeviceQuality } from '@/hooks/useDeviceQuality';
import {
  QualityProvider,
  useQuality,
} from '@/components/xso/viewers/QualityContext';
import { ScratchReveal } from '@/components/xso/paper/ScratchReveal';
import {
  CamcorderTimestamp,
  RewindGlitchBurst,
  VcrRewindButton,
} from '@/components/xso/paper/RewindChrome';
import {
  ReshuffleCollageButton,
  ReshuffleSlideCue,
  SCRAPBOOK_SPRING,
} from '@/components/xso/paper/ScrapbookChrome';
import { AccordionPullTab } from '@/components/xso/paper/AccordionChrome';
import {
  CrankAdvanceButton,
  FilmFrameCounter,
  ProjectorBeamOverlay,
} from '@/components/xso/paper/MovieBoxChrome';

const UI_SPRING = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 25,
  mass: 1.2,
};

const LOOP_SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 16,
  mass: 0.75,
};

/** Distinct stack angles in radians (~ -2° … 3°). */
const CARD_TILTS = [
  (-2 * Math.PI) / 180,
  (3 * Math.PI) / 180,
  (-1.4 * Math.PI) / 180,
  (2.2 * Math.PI) / 180,
];

/** Extra messy offsets for rewind stack settling. */
const REWIND_MESS = [
  { x: 0.18, y: -0.12, z: 0.04, rz: -0.06 },
  { x: -0.14, y: 0.08, z: -0.02, rz: 0.08 },
  { x: 0.1, y: 0.14, z: 0.06, rz: -0.04 },
  { x: -0.08, y: -0.06, z: 0.02, rz: 0.05 },
];

const REWIND_BURST = [
  { x: 3.8, y: 2.4, z: 1.6, rx: 0.9, ry: -0.7, rz: 1.4 },
  { x: -3.2, y: 1.8, z: 1.2, rx: -0.7, ry: 0.9, rz: -1.1 },
  { x: 2.6, y: -2.8, z: 2.0, rx: 0.5, ry: 1.1, rz: 0.8 },
  { x: -2.9, y: -2.1, z: 1.4, rx: -1.0, ry: -0.5, rz: -1.3 },
];

export interface R3FUnifiedViewerProps {
  data: XsoData;
  initialSide?: number;
}

const ACTION_LABELS: Record<GiftStyle, string> = {
  loop: 'Loop memory',
  rewind: 'Rewind memory',
  scrapbook: 'Reshuffle collage',
  accordion: 'Pull next panel',
  moviebox: 'Crank / advance',
};

export function R3FUnifiedViewer({
  data,
  initialSide = 0,
}: R3FUnifiedViewerProps) {
  const quality = useDeviceQuality();
  const [action, setAction] = useState(0);
  const [inspectedScrapbook, setInspectedScrapbook] = useState<number | null>(
    null,
  );
  const [pressing, setPressing] = useState(false);
  const [rewindGlitch, setRewindGlitch] = useState(false);
  const [reshuffleCue, setReshuffleCue] = useState(false);
  const glitchTimer = useRef<number | null>(null);
  const reshuffleTimer = useRef<number | null>(null);

  useEffect(() => {
    setAction(0);
    setInspectedScrapbook(null);
    setRewindGlitch(false);
    setReshuffleCue(false);
    return () => {
      if (glitchTimer.current) window.clearTimeout(glitchTimer.current);
      if (reshuffleTimer.current) window.clearTimeout(reshuffleTimer.current);
    };
  }, [data.giftStyle]);

  const trigger = () => {
    const style = data.giftStyle;
    if (style === 'rewind') {
      playCue('rewind');
      setRewindGlitch(true);
      if (glitchTimer.current) window.clearTimeout(glitchTimer.current);
      glitchTimer.current = window.setTimeout(() => {
        setRewindGlitch(false);
        glitchTimer.current = null;
      }, 300);
    } else if (style === 'scrapbook') {
      playCue('shuffle');
      setReshuffleCue(true);
      if (reshuffleTimer.current) window.clearTimeout(reshuffleTimer.current);
      reshuffleTimer.current = window.setTimeout(() => {
        setReshuffleCue(false);
        reshuffleTimer.current = null;
      }, 520);
    } else if (style === 'accordion') {
      playCue('click');
    } else if (style === 'moviebox') {
      playCue('crank');
    } else {
      playCue('click');
    }
    setAction((value) =>
      style === 'accordion' ? Math.min(3, value + 1) : value + 1,
    );
  };

  const stepAccordion = (direction: -1 | 1) => {
    setAction((value) => Math.max(0, Math.min(3, value + direction)));
  };

  const isLoop = data.giftStyle === 'loop';
  const isRewind = data.giftStyle === 'rewind';
  const isScrapbook = data.giftStyle === 'scrapbook';
  const isAccordion = data.giftStyle === 'accordion';
  const isMoviebox = data.giftStyle === 'moviebox';
  const movieFrame =
    (((action + initialSide) % 4) + 4) % 4 + 1;
  // Desk stack cycles 0→1→2→3; letter (scratch) is index 3.
  const topCardIndex = ((initialSide + action) % 4 + 4) % 4;
  const showLetterScratch = isLoop && topCardIndex === 3;

  const camcorderStamp = useMemo(() => {
    const raw = data.timestamp?.trim() || '08/15/2004';
    const parts = raw.split(/[\s/,-]+/);
    const monthNum = Number(parts[0]);
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ];
    const month =
      monthNum >= 1 && monthNum <= 12
        ? months[monthNum - 1]
        : parts[0]?.slice(0, 3).toUpperCase() || 'AUG';
    const year =
      parts.find((p) => /^\d{4}$/.test(p)) ||
      (parts[2]?.length === 4 ? parts[2] : '2004');
    return `${month} ${year}`;
  }, [data.timestamp]);

  return (
    <section
      className="relative h-full min-h-[520px] w-full overflow-hidden bg-[#0b0c0e] shadow-[inset_0_0_60px_#000]"
      aria-label={`3D ${data.giftStyle} souvenir`}
    >
      <Canvas
        key={`${data.giftStyle}-${quality.tier}`}
        style={{
          pointerEvents: inspectedScrapbook === null ? 'auto' : 'none',
        }}
        shadows={quality.shadows}
        dpr={quality.dpr}
        frameloop="always"
        camera={{ position: [0, 0.15, 11], fov: 40 }}
        gl={{
          antialias: quality.antialias,
          alpha: false,
          powerPreference: quality.powerPreference,
          stencil: false,
          depth: true,
        }}
        performance={{ min: quality.tier === 'low' ? 0.35 : 0.6 }}
      >
        <QualityProvider value={quality}>
          <PauseWhenHidden />
          <color attach="background" args={['#0d0f12']} />
          {quality.fog ? (
            <fog attach="fog" args={['#0d0f12', 10, 18]} />
          ) : null}
          <StudioLights />
          <DeskSurface />

          <SouvenirStage
            data={data}
            action={action}
            initialSide={initialSide}
            onInspectScrapbook={setInspectedScrapbook}
          />

          {quality.contactShadows ? (
            <ContactShadows
              position={[0, -3.05, 0]}
              opacity={0.68}
              scale={11}
              blur={2.4}
              far={5.5}
              resolution={512}
              color="#050506"
            />
          ) : (
            <mesh position={[0, -3.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[3.2, 24]} />
              <meshBasicMaterial color="#050506" transparent opacity={0.45} />
            </mesh>
          )}
        </QualityProvider>
      </Canvas>

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,transparent_30%,rgba(0,0,0,.48)_100%)]"
        aria-hidden
      />

      {isRewind ? (
        <>
          <CamcorderTimestamp
            label={`${camcorderStamp} — REWIND`}
            active={rewindGlitch}
          />
          <RewindGlitchBurst active={rewindGlitch} />
        </>
      ) : null}

      {isScrapbook ? <ReshuffleSlideCue active={reshuffleCue} /> : null}

      {isAccordion && (
        <p className="pointer-events-none absolute left-5 top-16 z-20 font-serif text-[11px] uppercase tracking-[0.18em] text-[#e8dcc7]/65">
          Postcard {Math.min(4, action + 1)} of 4
        </p>
      )}
      {isMoviebox && quality.softOverlays ? (
        <ProjectorBeamOverlay />
      ) : null}
      {isMoviebox ? <FilmFrameCounter frame={movieFrame} /> : null}
      {isAccordion && (
        <motion.div
          className={`absolute right-3 top-[42%] z-20 flex h-36 w-9 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full border border-[#c4a882]/25 bg-[#2a221c]/90 active:cursor-grabbing ${
            quality.softOverlays ? 'backdrop-blur-sm' : ''
          }`}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.7}
          dragMomentum={false}
          onDragEnd={(_, info) => {
            if (Math.abs(info.offset.y) < 30) return;
            stepAccordion(info.offset.y < 0 ? 1 : -1);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp') stepAccordion(1);
            if (event.key === 'ArrowDown') stepAccordion(-1);
          }}
          aria-label="Drag vertically to reveal accordion panels"
        >
          <span className="font-mono text-[11px] leading-3 text-[#e8dcc7]/45">
            ↑
            <br />
            ·
            <br />↓
          </span>
        </motion.div>
      )}
      <AnimatePresence>
        {showLetterScratch ? (
          <motion.div
            key="scratch-dock"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={LOOP_SPRING}
            className="absolute inset-x-3 bottom-[4.75rem] z-30 mx-auto max-w-[280px] sm:inset-x-6"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="mb-1.5 text-center font-hand text-[12px] text-[#d8cfc0]/80">
              a little secret under the foil ↓
            </p>
            <ScratchReveal
              key={data.scratchOffReward}
              reward={data.scratchOffReward}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isRewind ? (
        <VcrRewindButton
          onPress={trigger}
          pressing={pressing}
          setPressing={setPressing}
          label={ACTION_LABELS.rewind}
        />
      ) : isScrapbook ? (
        <ReshuffleCollageButton
          onPress={trigger}
          pressing={pressing}
          setPressing={setPressing}
        />
      ) : isAccordion ? (
        <AccordionPullTab
          onPress={trigger}
          pressing={pressing}
          setPressing={setPressing}
          panel={action % 4}
        />
      ) : isMoviebox ? (
        <CrankAdvanceButton
          onPress={trigger}
          pressing={pressing}
          setPressing={setPressing}
          crankTurn={action + initialSide}
          label={ACTION_LABELS.moviebox}
        />
      ) : (
        <motion.button
          type="button"
          onClick={trigger}
          onPointerDown={() => setPressing(true)}
          onPointerUp={() => setPressing(false)}
          onPointerLeave={() => setPressing(false)}
          whileHover={isLoop ? { y: -2 } : undefined}
          whileTap={isLoop ? { scale: 0.92, y: 5 } : { scale: 0.94, y: 2 }}
          transition={isLoop ? LOOP_SPRING : UI_SPRING}
          className={
            isLoop
              ? `absolute bottom-4 right-4 z-20 flex min-h-12 touch-manipulation select-none items-center justify-center rounded-[14px] border border-white/20 px-5 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#f2efe8] ${
                  pressing ? 'translate-y-1' : ''
                }`
              : `absolute bottom-4 right-4 z-20 flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full border border-white/15 bg-black/85 px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_8px_24px_rgba(0,0,0,.45)] ${
                  quality.softOverlays ? 'backdrop-blur-md' : ''
                }`
          }
          style={
            isLoop
              ? {
                  background:
                    'linear-gradient(180deg, #4a515c 0%, #2a2f38 42%, #181b20 100%)',
                  boxShadow: pressing
                    ? 'inset 0 3px 8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 0 #0a0a0a'
                    : 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(0,0,0,0.45), 0 8px 0 #0a0a0a, 0 14px 28px rgba(0,0,0,0.55)',
                }
              : undefined
          }
          aria-label={ACTION_LABELS[data.giftStyle]}
        >
          {ACTION_LABELS[data.giftStyle]}
        </motion.button>
      )}
      <p className="pointer-events-none absolute bottom-6 left-6 z-20 font-mono text-[8px] uppercase tracking-[0.2em] text-white/40">
        {isRewind
          ? 'Tape spool · rewind the stack'
          : isScrapbook
            ? 'Tap a scrap · inspect the memory'
            : isAccordion
              ? 'Pull the ribbon · unfold the keep'
              : isMoviebox
                ? 'Crank the wheel · advance the reel'
                : 'Drag to inspect · studio object'}
      </p>

      <AnimatePresence>
        {data.giftStyle === 'scrapbook' && inspectedScrapbook !== null && (
          <ScrapbookInspection
            key={inspectedScrapbook}
            data={data}
            index={inspectedScrapbook}
            onClose={() => setInspectedScrapbook(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function PauseWhenHidden() {
  const set = useThree((state) => state.set);

  useEffect(() => {
    const onVisibility = () => {
      set({
        frameloop: document.visibilityState === 'hidden' ? 'never' : 'always',
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [set]);

  return null;
}

function SouvenirStage({
  data,
  action,
  initialSide,
  onInspectScrapbook,
}: {
  data: XsoData;
  action: number;
  initialSide: number;
  onInspectScrapbook: (index: number) => void;
}) {
  const quality = useQuality();
  const scene = (
    <Center>
      <SouvenirScene
        key={data.giftStyle}
        data={data}
        action={action}
        initialSide={initialSide}
        onInspectScrapbook={onInspectScrapbook}
      />
    </Center>
  );

  const floated = quality.float ? (
    <Float
      speed={1.35}
      rotationIntensity={0.07}
      floatIntensity={0.12}
      floatingRange={[-0.04, 0.04]}
    >
      {scene}
    </Float>
  ) : (
    scene
  );

  if (!quality.presentationControls) {
    return floated;
  }

  return (
    <PresentationControls
      cursor
      snap
      speed={quality.tier === 'low' ? 0.85 : 1.15}
      zoom={0.92}
      rotation={[0, 0, 0]}
      polar={[-0.18, 0.22]}
      azimuth={[-0.32, 0.32]}
    >
      {floated}
    </PresentationControls>
  );
}

function SouvenirScene({
  data,
  action,
  initialSide,
  onInspectScrapbook,
}: {
  data: XsoData;
  action: number;
  initialSide: number;
  onInspectScrapbook: (index: number) => void;
}) {
  const textures = useMemoryTextures(data);

  switch (data.giftStyle) {
    case 'loop':
      return (
        <DeskStack
          textures={textures}
          action={action}
          initialSide={initialSide}
          direction={1}
          elastic
        />
      );
    case 'rewind':
      return (
        <DeskStack
          textures={textures}
          action={action}
          initialSide={initialSide}
          direction={-1}
          mode="rewind"
        />
      );
    case 'scrapbook':
      return (
        <ScrapbookScene
          textures={textures}
          action={action}
          onInspect={onInspectScrapbook}
        />
      );
    case 'accordion':
      return <AccordionScene textures={textures} panel={action % 4} />;
    case 'moviebox':
      return <MovieBoxScene textures={textures} turn={action + initialSide} />;
  }
}

function StudioLights() {
  const quality = useQuality();
  if (quality.tier === 'low') {
    return (
      <>
        <ambientLight intensity={1.05} />
        <hemisphereLight args={['#fff4df', '#17202a', 1.35]} />
        <directionalLight
          position={[4.5, 6.5, 8]}
          intensity={2.8}
          color="#fff0db"
        />
      </>
    );
  }

  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#fff4df', '#17202a', 1.2]} />
      <directionalLight
        castShadow
        position={[4.5, 6.5, 8]}
        intensity={3.8}
        color="#fff0db"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
      />
      <spotLight
        castShadow
        position={[-4, 3, 7]}
        intensity={24}
        angle={0.48}
        penumbra={0.9}
        color="#aec8d8"
      />
      <pointLight position={[4, -2, 4]} intensity={10} color="#d18d68" />
    </>
  );
}

function DeskSurface() {
  const quality = useQuality();
  return (
    <group position={[0, 0, -1.5]}>
      <mesh receiveShadow={quality.shadows}>
        <planeGeometry args={[18, 13]} />
        <meshStandardMaterial color="#17191c" roughness={0.92} metalness={0.02} />
      </mesh>
      {Array.from({ length: quality.deskStripes }).map((_, index) => (
        <mesh
          key={index}
          position={[-8.5 + index, 0, 0.012]}
          scale={[0.012, 6.5, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={index % 2 ? '#24272b' : '#101215'} />
        </mesh>
      ))}
    </group>
  );
}

function DeskStack({
  textures,
  action,
  initialSide,
  direction,
  elastic = false,
  mode = 'loop',
}: {
  textures: Texture[];
  action: number;
  initialSide: number;
  direction: 1 | -1;
  elastic?: boolean;
  mode?: 'loop' | 'rewind';
}) {
  const isRewind = mode === 'rewind';
  const [order, setOrder] = useState(() =>
    rotateIndices(textures.length, initialSide),
  );
  const orderRef = useRef(order);
  orderRef.current = order;
  const cardRefs = useRef<(Group | null)[]>([]);
  const phase = useRef(1);
  const handledAction = useRef(action);
  const orderFlipped = useRef(false);

  useEffect(() => {
    if (handledAction.current === action) return;
    const steps = action - handledAction.current;
    handledAction.current = action;
    if (steps <= 0) return;

    if (steps === 1 && phase.current >= 1) {
      phase.current = 0;
      orderFlipped.current = false;
      return;
    }

    // Rapid presses: snap to logical order.
    const logical = isRewind
      ? rotateIndices(
          textures.length,
          (((initialSide - action) % textures.length) + textures.length) %
            textures.length,
        )
      : rotateIndices(
          textures.length,
          (initialSide + action) % textures.length,
        );
    setOrder(logical);
    orderRef.current = logical;
    phase.current = 1;
    orderFlipped.current = true;
    cardRefs.current.forEach((card) => {
      if (!card) return;
      card.position.set(0, 0, 0);
      card.rotation.set(0, 0, 0);
    });
  }, [action, initialSide, textures.length, isRewind]);

  useFrame((_, delta) => {
    if (phase.current >= 1) return;

    if (isRewind) {
      // Chaotic explode → spring snap (local offsets; parent holds rest pose).
      const speed = 1.05;
      phase.current = Math.min(1, phase.current + delta * speed);
      const t = phase.current;
      const explodeEnd = 0.42;

      if (t < explodeEnd) {
        const u = t / explodeEnd;
        const burst = Math.sin(u * (Math.PI / 2));
        orderRef.current.forEach((textureIndex) => {
          const card = cardRefs.current[textureIndex];
          if (!card) return;
          const boom = REWIND_BURST[textureIndex] ?? REWIND_BURST[0];
          card.position.x = boom.x * burst;
          card.position.y = boom.y * burst;
          card.position.z = boom.z * burst;
          card.rotation.x = boom.rx * burst;
          card.rotation.y = boom.ry * burst;
          card.rotation.z = boom.rz * burst;
        });
      } else {
        if (!orderFlipped.current) {
          const current = orderRef.current;
          const next = [
            current[current.length - 1],
            ...current.slice(0, -1),
          ];
          orderRef.current = next;
          setOrder(next);
          orderFlipped.current = true;
        }
        const u = (t - explodeEnd) / (1 - explodeEnd);
        const spring =
          1 - Math.pow(2, -9 * u) * Math.cos((u * 5.5 * Math.PI) / 2);
        const settle = Math.min(1.12, Math.max(0, spring));

        orderRef.current.forEach((textureIndex) => {
          const card = cardRefs.current[textureIndex];
          if (!card) return;
          const boom = REWIND_BURST[textureIndex] ?? REWIND_BURST[0];
          card.position.x = boom.x * (1 - settle);
          card.position.y = boom.y * (1 - settle);
          card.position.z = boom.z * (1 - settle);
          card.rotation.x = boom.rx * (1 - settle);
          card.rotation.y = boom.ry * (1 - settle);
          card.rotation.z = boom.rz * (1 - settle);
        });
      }

      if (t >= 1) {
        cardRefs.current.forEach((card) => {
          if (!card) return;
          card.position.set(0, 0, 0);
          card.rotation.set(0, 0, 0);
        });
      }
      return;
    }

    // Loop / default toss path
    const topIndex = orderRef.current[0];
    const card = topIndex === undefined ? null : cardRefs.current[topIndex];
    if (!card) return;

    const speed = elastic ? 1.15 : 1.45;
    phase.current = Math.min(1, phase.current + delta * speed);
    const t = phase.current;
    const e = elastic
      ? Math.min(
          1.08,
          Math.max(
            0,
            1 - Math.pow(2, -10 * t) * Math.cos((t * Math.PI * 4.5) / 2),
          ),
        )
      : t;
    const lift = Math.sin(Math.min(1, e) * Math.PI);

    card.position.x = direction * lift * 3.75;
    card.position.y = lift * 2.35;
    card.position.z = 0.55 + lift * 1.85 - e * 0.55;
    card.rotation.z = direction * e * 1.05;
    card.rotation.y = direction * Math.sin(e * Math.PI) * 0.38;
    card.rotation.x = -lift * 0.12;

    if (t >= 1) {
      setOrder((current) => [...current.slice(1), current[0]]);
      card.position.set(0, 0, 0);
      card.rotation.set(0, 0, 0);
    }
  });

  return (
    <group rotation={[-0.08, 0.06, -0.025]} position={[0, 0.1, 0]}>
      {[...order].reverse().map((textureIndex, reverseIndex) => {
        const depth = order.length - 1 - reverseIndex;
        const top = depth === 0;
        const tilt = CARD_TILTS[textureIndex] ?? 0;
        const mess = isRewind
          ? REWIND_MESS[textureIndex] ?? REWIND_MESS[0]
          : { x: 0, y: 0, z: 0, rz: 0 };
        return (
          <group
            key={textureIndex}
            ref={(node) => {
              cardRefs.current[textureIndex] = node;
            }}
            position={[
              depth * (isRewind ? 0.12 : 0.1) +
                (top ? mess.x * 0.35 : depth * 0.02 + mess.x),
              -depth * (isRewind ? 0.1 : 0.09) + mess.y * (top ? 0.2 : 1),
              depth * (isRewind ? 0.16 : 0.14) + mess.z,
            ]}
            rotation={[0.01 * depth, 0, tilt + mess.rz]}
          >
            <CardMesh
              texture={textures[textureIndex]}
              kind={textureIndex}
              elevated={top}
              aged={isRewind}
            />
          </group>
        );
      })}
    </group>
  );
}

function CardMesh({
  texture,
  kind,
  elevated,
  aged = false,
}: {
  texture: Texture;
  kind: number;
  elevated: boolean;
  aged?: boolean;
}) {
  const isPhoto = kind === 2;
  const paperColor = aged
    ? kind === 1
      ? '#e8d48a'
      : '#f0e6d2'
    : kind === 1
      ? '#f3e4a0'
      : '#fcfaf2';
  const roughness = aged ? 0.88 : 0.72;
  const shadowOpacity = aged ? (elevated ? 0.32 : 0.18) : elevated ? 0.2 : 0.12;

  if (isPhoto) {
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, -0.12, -0.02]}>
          <boxGeometry args={[3.45, 4.75, 0.1]} />
          <meshStandardMaterial
            color={aged ? '#efe6d4' : '#fcfaf2'}
            roughness={aged ? 0.9 : 0.82}
            metalness={0}
          />
        </mesh>
        <mesh castShadow position={[0, 0.22, 0.04]}>
          <boxGeometry args={[2.95, 3.35, 0.04]} />
          <meshStandardMaterial
            map={texture}
            color={aged ? '#f5efe4' : '#fffdf8'}
            roughness={aged ? 0.7 : 0.55}
            metalness={0}
          />
        </mesh>
        {/* Dog-ear crease */}
        {aged ? (
          <mesh position={[1.55, 2.15, 0.06]} rotation={[0, 0, -0.4]}>
            <planeGeometry args={[0.55, 0.55]} />
            <meshStandardMaterial
              color="#d9d0bc"
              roughness={0.95}
              metalness={0}
              transparent
              opacity={0.85}
            />
          </mesh>
        ) : null}
        <mesh
          position={[aged ? 0.14 : 0.08, -0.12, -0.1]}
          rotation={[-0.02, 0, 0.01]}
        >
          <planeGeometry args={[3.55, 4.9]} />
          <meshBasicMaterial color="#000" transparent opacity={shadowOpacity} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.25, 4.5, aged ? 0.1 : 0.09]} />
        <meshStandardMaterial
          map={texture}
          color={paperColor}
          roughness={roughness}
          metalness={0}
        />
      </mesh>
      <mesh position={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[3.3, 4.55, 0.025]} />
        <meshStandardMaterial
          color={aged ? '#d4c9b0' : '#e4ddd0'}
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      {aged ? (
        <mesh position={[1.45, 2.05, 0.055]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial
            color="#cfc4ae"
            roughness={1}
            metalness={0}
            transparent
            opacity={0.9}
          />
        </mesh>
      ) : null}
      <mesh position={[aged ? 0.14 : 0.08, aged ? -0.1 : -0.06, -0.1]}>
        <planeGeometry args={[aged ? 3.5 : 3.35, aged ? 4.75 : 4.6]} />
        <meshBasicMaterial color="#000" transparent opacity={shadowOpacity} />
      </mesh>
    </group>
  );
}

function ScrapbookScene({
  textures,
  action,
  onInspect,
}: {
  textures: Texture[];
  action: number;
  onInspect: (index: number) => void;
}) {
  const items = useRef<(Group | null)[]>([]);
  const phase = useRef(1);
  const handledAction = useRef(action);

  const layouts: Array<Array<[number, number, number, number]>> = [
    [
      [-0.9, 2.15, 0.55, -0.14],
      [0.78, 0.95, 0.72, 0.11],
      [-0.78, -1.0, 0.88, 0.09],
      [0.72, -2.28, 1.02, -0.1],
    ],
    [
      [0.85, 2.05, 0.6, 0.16],
      [-0.7, 0.7, 0.78, -0.13],
      [0.68, -0.85, 0.92, -0.07],
      [-0.82, -2.2, 1.05, 0.12],
    ],
    [
      [-0.55, 2.35, 0.58, 0.08],
      [0.9, 0.55, 0.8, -0.15],
      [-0.95, -0.7, 0.7, 0.14],
      [0.4, -2.4, 1.1, -0.05],
    ],
    [
      [0.6, 2.25, 0.65, -0.11],
      [-0.88, 0.9, 0.75, 0.1],
      [0.82, -1.15, 0.95, 0.06],
      [-0.55, -2.15, 0.85, -0.13],
    ],
  ];

  const layoutIndex = ((action % layouts.length) + layouts.length) % layouts.length;
  const targets = layouts[layoutIndex];

  useEffect(() => {
    if (handledAction.current === action) return;
    handledAction.current = action;
    phase.current = 0;
  }, [action]);

  useFrame((_, delta) => {
    if (phase.current < 1) {
      phase.current = Math.min(1, phase.current + delta * 1.35);
    }
    const t = phase.current;
    const scatter = t < 0.38 ? Math.sin((t / 0.38) * Math.PI) : 0;
    const settle =
      t < 0.38
        ? 0
        : Math.min(
            1.08,
            Math.max(
              0,
              1 -
                Math.pow(2, -8 * ((t - 0.38) / 0.62)) *
                  Math.cos((((t - 0.38) / 0.62) * 4.2 * Math.PI) / 2),
            ),
          );

    items.current.forEach((item, index) => {
      if (!item) return;
      const [tx, ty, tz, tr] = targets[index];
      const burstX = (index % 2 === 0 ? 1 : -1) * (1.6 + index * 0.35);
      const burstY = (index < 2 ? 1 : -1) * (1.2 + (index % 2) * 0.4);
      const goalX = tx + burstX * scatter * (1 - settle);
      const goalY = ty + burstY * scatter * (1 - settle);
      const goalZ = tz + scatter * 0.8 * (1 - settle);
      const goalR = tr + scatter * (index % 2 === 0 ? 0.55 : -0.45) * (1 - settle);

      const damp = t < 1 ? 9 : 7;
      item.position.x = MathUtils.damp(item.position.x, goalX, damp, delta);
      item.position.y = MathUtils.damp(item.position.y, goalY, damp, delta);
      item.position.z = MathUtils.damp(item.position.z, goalZ, damp, delta);
      item.rotation.z = MathUtils.damp(item.rotation.z, goalR, damp, delta);
    });
  });

  return (
    <group rotation={[-0.06, 0.035, 0]} scale={0.92}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[4.65, 7.45, 0.28]} />
        <meshStandardMaterial color="#2a221c" roughness={0.98} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0, 0.12]}>
        <boxGeometry args={[4.35, 7.1, 0.06]} />
        <meshStandardMaterial color="#6e4d32" roughness={0.96} />
      </mesh>
      <mesh castShadow position={[-2.05, 0, 0.2]} scale={[0.12, 7.1, 0.12]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4a3424" roughness={0.9} />
      </mesh>
      <PaperFibers />

      {textures.map((texture, index) => {
        const [x, y, z, rotation] = targets[index];
        return (
          <group
            key={texture.uuid}
            ref={(node) => {
              items.current[index] = node;
            }}
            position={[x, y, z]}
            rotation={[0, 0, rotation]}
            onClick={(event) => {
              event.stopPropagation();
              onInspect(index);
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = '';
            }}
          >
            {/* Multi-tier drop shadow */}
            <mesh position={[0.12, -0.1, -0.08]} rotation={[-0.02, 0, 0.02]}>
              <planeGeometry args={[2.6, 3.2]} />
              <meshBasicMaterial color="#000" transparent opacity={0.28} />
            </mesh>
            <mesh position={[0.22, -0.18, -0.12]} rotation={[-0.02, 0, 0.03]}>
              <planeGeometry args={[2.4, 3.0]} />
              <meshBasicMaterial color="#000" transparent opacity={0.12} />
            </mesh>
            {index === 1 ? (
              <MemoMesh texture={texture} />
            ) : index === 3 ? (
              <TicketMesh texture={texture} />
            ) : (
              <PolaroidMesh texture={texture} />
            )}
          </group>
        );
      })}
    </group>
  );
}

function PaperFibers() {
  const quality = useQuality();
  if (!quality.paperFibers) return null;
  return (
    <group position={[0, 0, 0.17]}>
      {Array.from({ length: 28 }).map((_, index) => (
        <mesh
          key={index}
          position={[
            ((index * 37) % 43) / 10 - 2.15,
            ((index * 23) % 69) / 10 - 3.4,
            0,
          ]}
          rotation={[0, 0, (index % 5) * 0.22]}
          scale={[0.12 + (index % 3) * 0.05, 0.008, 1]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={index % 2 ? '#d0a678' : '#65462f'} />
        </mesh>
      ))}
    </group>
  );
}

function PolaroidMesh({ texture }: { texture: Texture }) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.3, 3.05, 0.1]} />
        <meshStandardMaterial color="#fffdf7" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.25, 0.058]}>
        <planeGeometry args={[2.02, 2.32]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <WashiMesh position={[-0.83, 1.42, 0.12]} rotation={-0.42} color="#a9b9a2" />
      <WashiMesh position={[0.84, 1.42, 0.12]} rotation={0.38} color="#d8cda9" />
    </group>
  );
}

function MemoMesh({ texture }: { texture: Texture }) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.65, 2.05, 0.085]} />
        <meshStandardMaterial color="#f0dd72" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0, 0.048]}>
        <planeGeometry args={[2.38, 1.72]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <WashiMesh position={[-1.22, 0.2, 0.1]} rotation={1.42} color="#ded0ad" />
      <PaperclipMesh position={[1.05, 0.85, 0.12]} />
    </group>
  );
}

function TicketMesh({ texture }: { texture: Texture }) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.8, 1.55, 0.09]} />
        <meshStandardMaterial color="#dfcda9" roughness={0.84} />
      </mesh>
      <mesh position={[-0.32, 0, 0.052]}>
        <planeGeometry args={[1.9, 1.25]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[1, 0, 0.055]}>
        <planeGeometry args={[0.6, 1.34]} />
        <meshBasicMaterial color="#b86655" />
      </mesh>
    </group>
  );
}

function WashiMesh({
  position,
  rotation,
  color,
}: {
  position: [number, number, number];
  rotation: number;
  color: string;
}) {
  return (
    <group position={position} rotation={[0, 0, rotation]}>
      {/* Main translucent strip */}
      <mesh castShadow>
        <boxGeometry args={[0.98, 0.28, 0.022]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.7}
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      {/* Fiber weave stripes */}
      {[-0.28, -0.08, 0.12, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.012]} rotation={[0, 0, 0.08 * (i % 2 ? 1 : -1)]}>
          <planeGeometry args={[0.035, 0.24]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.12 + (i % 2) * 0.06} />
        </mesh>
      ))}
      {/* Specular highlight */}
      <mesh position={[0.05, 0.05, 0.014]}>
        <planeGeometry args={[0.62, 0.05]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.28} />
      </mesh>
      {/* Torn left end */}
      <mesh position={[-0.52, 0.03, 0.004]} rotation={[0, 0, 0.22]}>
        <boxGeometry args={[0.14, 0.2, 0.018]} />
        <meshStandardMaterial color={color} transparent opacity={0.62} roughness={1} />
      </mesh>
      <mesh position={[-0.55, -0.06, 0.005]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.1, 0.14, 0.016]} />
        <meshStandardMaterial color={color} transparent opacity={0.55} roughness={1} />
      </mesh>
      {/* Torn right end */}
      <mesh position={[0.52, -0.02, 0.004]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.13, 0.19, 0.018]} />
        <meshStandardMaterial color={color} transparent opacity={0.6} roughness={1} />
      </mesh>
      <mesh position={[0.56, 0.07, 0.005]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.09, 0.12, 0.016]} />
        <meshStandardMaterial color={color} transparent opacity={0.5} roughness={1} />
      </mesh>
    </group>
  );
}

function PaperclipMesh({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, 0, 0.2]}>
      <mesh castShadow>
        <torusGeometry args={[0.17, 0.025, 8, 24]} />
        <meshStandardMaterial color="#879099" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[0.05, 0.42, 0.035]} />
        <meshStandardMaterial color="#879099" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

function ScrapbookInspection({
  data,
  index,
  onClose,
}: {
  data: XsoData;
  index: number;
  onClose: () => void;
}) {
  const quality = useDeviceQuality();
  const titles = [
    'Receipt of Lore',
    'Friendship Field Note',
    'Core Memory',
    'A Note for You',
  ];

  return (
    <motion.div
      className={`fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/80 p-4 ${
        quality.softOverlays ? 'backdrop-blur-md' : ''
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Inspect ${titles[index]}`}
    >
      <motion.article
        layoutId={`scrapbook-memory-${index}`}
        className="relative max-h-[82vh] w-full max-w-md cursor-default overflow-y-auto rounded-sm border border-[#e8dfd0] bg-[#fcfaf2] p-6 text-[#292722] shadow-[0_8px_24px_rgba(0,0,0,.4),0_40px_100px_rgba(0,0,0,.55)]"
        initial={{ scale: 0.72, y: 56, rotate: index % 2 ? 5 : -5 }}
        animate={{ scale: 1, y: 0, rotate: 0 }}
        exit={{ scale: 0.82, y: 28, opacity: 0, rotate: index % 2 ? -3 : 3 }}
        transition={SCRAPBOOK_SPRING}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.55'/%3E%3C/svg%3E\")",
            backgroundSize: '160px 160px',
          }}
          aria-hidden
        />
        <div className="relative z-10">
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-500">
            Memory {String(index + 1).padStart(2, '0')} · {data.id}
          </p>
          <h2 className="mt-2 font-hand text-[28px] font-semibold leading-tight text-[#2d302c]">
            {titles[index]}
          </h2>

          {index === 0 && (
            <div className="mt-5 border-y border-dashed border-black/25 py-4 font-mono text-sm leading-relaxed">
              {data.lineItems.map((item) => (
                <p key={item.id} className="flex justify-between gap-4 py-1.5">
                  <span>
                    {item.qty} {item.description}
                  </span>
                  <strong>{item.price}</strong>
                </p>
              ))}
              <p className="mt-4 flex justify-between border-t border-black/20 pt-4 text-base font-bold">
                <span>Total</span>
                <span>{data.total}</span>
              </p>
            </div>
          )}

          {index === 1 && (
            <div className="mt-5 space-y-3">
              {Object.entries(data.auditMetrics).map(([label, score]) => (
                <div key={label}>
                  <p className="flex justify-between font-mono text-xs uppercase tracking-wide">
                    <span>{label}</span>
                    <strong>{score}/100</strong>
                  </p>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-[#71816f]"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="mt-5 rotate-[-2deg] border-2 border-[#a54b43] p-3 text-center font-mono text-sm font-bold text-[#a54b43]">
                {data.certifiedStampText}
              </p>
            </div>
          )}

          {index === 2 && (
            <div className="mt-5 bg-white p-3 pb-10 shadow-[0_12px_30px_rgba(45,31,20,.25)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.photos[0]}
                alt={`Memory of ${data.customerName} and ${data.billerName}`}
                className="aspect-[4/5] w-full object-cover"
              />
              <p className="mt-4 text-center font-hand text-[20px] font-semibold leading-snug">
                Missed the train. Found the best story.
              </p>
            </div>
          )}

          {index === 3 && (
            <div className="mt-5 whitespace-pre-wrap font-hand text-[19px] leading-8 text-[#2c241c]">
              <p>Dear {data.customerName},</p>
              <p className="mt-4">{data.birthdayMessage}</p>
              <p className="mt-6">Always, {data.billerName}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-full border border-black/10 bg-[#29332f] px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#f5efe3]"
          >
            ✕ Tap anywhere to close
          </button>
        </div>
      </motion.article>
    </motion.div>
  );
}

function AccordionScene({
  textures,
  panel,
}: {
  textures: Texture[];
  panel: number;
}) {
  const ribbon = useRef<Group>(null);
  const darkCreases = useRef<Array<{ opacity: number } | null>>([]);
  const softCreases = useRef<Array<{ opacity: number } | null>>([]);
  const panelHeight = 4.55;
  const velocity = useRef(0);
  const currentY = useRef(0);

  useFrame((_, delta) => {
    if (!ribbon.current) return;
    const targetY = panel * panelHeight;
    const force = (targetY - currentY.current) * 42;
    velocity.current += force * delta;
    velocity.current *= Math.exp(-5.2 * delta);
    currentY.current += velocity.current * delta;
    ribbon.current.position.y = currentY.current;

    ribbon.current.rotation.x = MathUtils.damp(
      ribbon.current.rotation.x,
      panel % 2 === 0 ? -0.04 : 0.04,
      6,
      delta,
    );

    textures.forEach((_, index) => {
      const dark = darkCreases.current[index];
      const soft = softCreases.current[index];
      if (!dark || !soft) return;
      const dist = Math.abs(currentY.current / panelHeight - index);
      const closed = MathUtils.clamp(1 - dist * 1.15, 0, 1);
      dark.opacity = MathUtils.damp(dark.opacity, 0.18 + closed * 0.45, 8, delta);
      soft.opacity = MathUtils.damp(soft.opacity, 0.08 + closed * 0.22, 8, delta);
    });
  });

  return (
    <group scale={0.9} rotation={[0, 0.05, 0]} position={[0, 0.05, 0]}>
      <group ref={ribbon}>
        {textures.map((texture, index) => (
          <group
            key={texture.uuid}
            position={[
              0,
              -index * panelHeight,
              index % 2 === 0 ? 0.05 : -0.1,
            ]}
            rotation={[(index % 2 === 0 ? 1 : -1) * 0.055, 0, 0]}
          >
            <mesh castShadow receiveShadow>
              <boxGeometry args={[3.15, panelHeight - 0.08, 0.1]} />
              <meshStandardMaterial
                color="#f4efe6"
                roughness={0.92}
                metalness={0}
              />
            </mesh>
            <mesh position={[0, 0.02, 0.056]}>
              <planeGeometry args={[2.82, panelHeight - 0.42]} />
              <meshBasicMaterial map={texture} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, 0.058]}>
              <planeGeometry args={[3.1, panelHeight - 0.12]} />
              <meshBasicMaterial color="#d8cfc0" transparent opacity={0.08} />
            </mesh>
            <mesh position={[0, panelHeight / 2 - 0.12, 0.057]}>
              <planeGeometry args={[3.05, 0.16]} />
              <meshBasicMaterial color="#f4efe6" />
            </mesh>
            <mesh position={[0, -panelHeight / 2 + 0.12, 0.057]}>
              <planeGeometry args={[3.05, 0.16]} />
              <meshBasicMaterial color="#f4efe6" />
            </mesh>
            <mesh
              position={[0, -panelHeight / 2 + 0.04, 0.072]}
              scale={[3.05, 0.085, 1]}
            >
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial
                color="#2a2018"
                transparent
                opacity={0.45}
                ref={(mat) => {
                  darkCreases.current[index] = mat;
                }}
              />
            </mesh>
            <mesh
              position={[0, -panelHeight / 2 + 0.12, 0.065]}
              scale={[3.05, 0.18, 1]}
            >
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial
                color="#6b5744"
                transparent
                opacity={0.15}
                ref={(mat) => {
                  softCreases.current[index] = mat;
                }}
              />
            </mesh>
            <mesh
              position={[0, -panelHeight / 2 + 0.22, 0.06]}
              scale={[2.9, 0.1, 1]}
            >
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#fff8ee" transparent opacity={0.12} />
            </mesh>
            {index === 0 && (
              <>
                <Grommet position={[-0.7, panelHeight / 2 - 0.28, 0.1]} />
                <Grommet position={[0.7, panelHeight / 2 - 0.28, 0.1]} />
                <mesh
                  position={[0, panelHeight / 2 - 0.28, 0.07]}
                  scale={[1.2, 0.07, 1]}
                >
                  <planeGeometry args={[1, 1]} />
                  <meshStandardMaterial color="#6f5140" roughness={0.72} />
                </mesh>
              </>
            )}
          </group>
        ))}
      </group>
    </group>
  );
}

function Grommet({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <torusGeometry args={[0.11, 0.045, 12, 28]} />
      <meshStandardMaterial color="#8b8072" metalness={0.82} roughness={0.24} />
    </mesh>
  );
}

const FILM_PULL = -1.68;
const FILM_SPRING_K = 58;
const FILM_DAMP = 7.2;

function MovieBoxScene({ textures, turn }: { textures: Texture[]; turn: number }) {
  const quality = useQuality();
  const strip = useRef<Group>(null);
  const stripY = useRef(0);
  const stripVelocity = useRef(0);
  const previousTurn = useRef(turn);
  const current =
    ((turn % textures.length) + textures.length) % textures.length;

  useEffect(() => {
    if (previousTurn.current === turn) return;
    previousTurn.current = turn;
    stripY.current = FILM_PULL;
    if (strip.current) strip.current.position.y = FILM_PULL;
    stripVelocity.current = 3.2;
  }, [turn]);

  useFrame((_, delta) => {
    if (!strip.current) return;
    const force = -stripY.current * FILM_SPRING_K;
    stripVelocity.current += force * delta;
    stripVelocity.current *= Math.exp(-FILM_DAMP * delta);
    stripY.current += stripVelocity.current * delta;
    if (Math.abs(stripY.current) < 0.0008 && Math.abs(stripVelocity.current) < 0.02) {
      stripY.current = 0;
      stripVelocity.current = 0;
    }
    strip.current.position.y = stripY.current;
    strip.current.rotation.x = MathUtils.damp(
      strip.current.rotation.x,
      0,
      9,
      delta,
    );
  });

  return (
    <group scale={0.92} position={[0, 0.05, 0]}>
      <pointLight position={[0, 0.2, 2.2]} intensity={7.5} color="#ffd19a" />
      {quality.tier === 'high' ? (
        <spotLight
          position={[0.5, 1.2, 2.5]}
          angle={0.45}
          penumbra={0.85}
          intensity={12}
          color="#ffb870"
          castShadow
        />
      ) : (
        <directionalLight
          position={[0.5, 1.2, 2.5]}
          intensity={4.5}
          color="#ffb870"
        />
      )}
      {/* Projector housing */}
      <mesh
        castShadow={quality.shadows}
        receiveShadow={quality.shadows}
        position={[0, 0, -0.62]}
        scale={[2.52, 3.78, 0.9]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#351018"
          roughness={0.22}
          metalness={0.78}
        />
      </mesh>
      <mesh position={[0, 0, -0.35]} scale={[2.35, 3.55, 0.15]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#4a2030"
          roughness={0.35}
          metalness={0.65}
        />
      </mesh>
      {/* Lens viewport recess — fixed gate (no jitter) */}
      <mesh position={[0, 0, 0.12]} scale={[2.28, 1.68, 0.24]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#050405" metalness={0.55} roughness={0.42} />
      </mesh>
      <group ref={strip} position={[0, 0, 0.6]}>
        <FilmFrame texture={textures[current]} />
      </group>
      <ProjectorBezel />
      <ProjectorSpools turn={turn} />
      <BronzeCrankWheel turn={turn} />
      <ProjectionCone />
    </group>
  );
}

function FilmFrame({ texture }: { texture: Texture }) {
  const quality = useQuality();
  const sprocketY =
    quality.tier === 'low'
      ? [-0.95, -0.29, 0.37, 1.03]
      : [-0.95, -0.62, -0.29, 0.04, 0.37, 0.7, 1.03];
  return (
    <group>
      {/* Film strip carrier */}
      <mesh castShadow={quality.shadows} receiveShadow={quality.shadows} position={[0, 0, -0.02]}>
        <boxGeometry args={[4.35, 2.55, 0.07]} />
        <meshStandardMaterial color="#1a1410" roughness={0.85} metalness={0.15} />
      </mesh>
      {/* Cell base */}
      <mesh castShadow={quality.shadows}>
        <boxGeometry args={[4.18, 2.42, 0.055]} />
        <meshStandardMaterial color="#0e0b0d" roughness={0.72} />
      </mesh>
      {/* Projected image */}
      <mesh position={[0, 0, 0.032]}>
        <planeGeometry args={[3.34, 1.94]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* Subtitle / projected glow */}
      {quality.softOverlays ? (
        <mesh position={[0, 0, 0.034]}>
          <planeGeometry args={[3.34, 1.94]} />
          <meshBasicMaterial
            color="#ffcc88"
            transparent
            opacity={0.1}
            blending={AdditiveBlending}
          />
        </mesh>
      ) : null}
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[3.2, 1.78]} />
        <meshBasicMaterial color="#000" transparent opacity={0.18} />
      </mesh>
      {/* Perforations — both edges */}
      {[-1.95, 1.95].flatMap((x) =>
        sprocketY.flatMap((y, hole) => [
          <mesh
            key={`${x}-hole-${hole}`}
            position={[x, y, 0.038]}
            scale={[0.11, 0.085, 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#080604" />
          </mesh>,
          <mesh
            key={`${x}-rim-${hole}`}
            position={[x, y, 0.036]}
            scale={[0.14, 0.11, 1]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#c9a86a" />
          </mesh>,
        ]),
      )}
      {/* Edge shadow tiers */}
      <mesh position={[0.08, -0.06, -0.04]}>
        <planeGeometry args={[4.3, 2.5]} />
        <meshBasicMaterial color="#000" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

function BronzeCrankWheel({ turn }: { turn: number }) {
  const crank = useRef<Group>(null);
  const angle = useRef(0);
  const spinVelocity = useRef(0);
  const previousTurn = useRef(turn);

  useEffect(() => {
    if (previousTurn.current === turn) return;
    previousTurn.current = turn;
    spinVelocity.current += 5.5;
  }, [turn]);

  useFrame((_, delta) => {
    if (!crank.current) return;
    const target = turn * Math.PI * 1.35;
    const force = (target - angle.current) * 72;
    spinVelocity.current += force * delta;
    spinVelocity.current *= Math.exp(-5.5 * delta);
    angle.current += spinVelocity.current * delta;
    crank.current.rotation.z = angle.current;
  });

  return (
    <group position={[2.05, -2.35, 0.92]}>
      <mesh castShadow position={[0, 0, -0.06]}>
        <cylinderGeometry args={[0.42, 0.42, 0.08, 32]} />
        <meshStandardMaterial color="#2a1810" roughness={0.8} metalness={0.4} />
      </mesh>
      <group ref={crank}>
        <mesh castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.12, 32]} />
          <meshStandardMaterial
            color="#c9925a"
            metalness={0.88}
            roughness={0.28}
            envMapIntensity={1.2}
          />
        </mesh>
        <mesh position={[0, 0, 0.07]}>
          <circleGeometry args={[0.32, 32]} />
          <meshStandardMaterial
            color="#e8b878"
            metalness={0.75}
            roughness={0.22}
          />
        </mesh>
        <mesh position={[0.52, 0, 0.1]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.55, 16]} />
          <meshStandardMaterial
            color="#8b5a32"
            metalness={0.82}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0.78, 0, 0.1]} castShadow>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshStandardMaterial
            color="#6b4423"
            metalness={0.85}
            roughness={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}

function ProjectorBezel() {
  const gateY = [1.05, 0.7, 0.35, 0, -0.35, -0.7, -1.05];
  return (
    <group position={[0, 0, 0.86]}>
      {[
        { position: [0, 1.56, 0] as const, scale: [2.34, 0.22, 0.25] as const },
        { position: [0, -1.56, 0] as const, scale: [2.34, 0.22, 0.25] as const },
        { position: [-2.27, 0, 0] as const, scale: [0.24, 1.52, 0.25] as const },
        { position: [2.27, 0, 0] as const, scale: [0.24, 1.52, 0.25] as const },
      ].map((bar, index) => (
        <mesh key={index} position={bar.position} scale={bar.scale} castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#4a1621"
            metalness={0.82}
            roughness={0.2}
          />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.04]} scale={[2.05, 1.28, 0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#030203" roughness={0.92} metalness={0.08} />
      </mesh>
      {[-1.9, 1.9].map((x) => (
        <group key={x}>
          <mesh position={[x, 0, 0.08]} scale={[0.3, 1.35, 0.16]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#090608" roughness={0.75} />
          </mesh>
          {gateY.map((y, index) => (
            <group key={index}>
              <mesh
                position={[x, y, 0.17]}
                scale={[0.15, 0.1, 1]}
              >
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#c9a86a" />
              </mesh>
              <mesh
                position={[x, y, 0.19]}
                scale={[0.1, 0.065, 1]}
              >
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#050403" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function ProjectorSpools({ turn }: { turn: number }) {
  const supply = useRef<Group>(null);
  const takeUp = useRef<Group>(null);

  useFrame((_, delta) => {
    if (supply.current) {
      supply.current.rotation.z = MathUtils.damp(
        supply.current.rotation.z,
        -turn * Math.PI * 1.5,
        8,
        delta,
      );
    }
    if (takeUp.current) {
      takeUp.current.rotation.z = MathUtils.damp(
        takeUp.current.rotation.z,
        turn * Math.PI * 1.75,
        8,
        delta,
      );
    }
  });

  return (
    <group position={[0, 0, 1.12]}>
      <group ref={supply} position={[-0.92, 2.65, 0]}>
        <SpoolMesh />
      </group>
      <group ref={takeUp} position={[0.92, -2.65, 0]}>
        <SpoolMesh />
      </group>
    </group>
  );
}

function SpoolMesh() {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0, -0.04]}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 32]} />
        <meshStandardMaterial color="#1a100c" roughness={0.85} metalness={0.35} />
      </mesh>
      <mesh castShadow>
        <torusGeometry args={[0.52, 0.085, 12, 40]} />
        <meshStandardMaterial
          color="#c9925a"
          metalness={0.88}
          roughness={0.24}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.04, 8, 32]} />
        <meshStandardMaterial
          color="#e8b878"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      {[0, Math.PI / 3, (Math.PI * 2) / 3].map((rotation) => (
        <mesh key={rotation} rotation={[0, 0, rotation]} scale={[1, 0.07, 0.07]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#8a6447"
            metalness={0.82}
            roughness={0.22}
          />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.04]}>
        <circleGeometry args={[0.13, 24]} />
        <meshStandardMaterial
          color="#4a2818"
          metalness={0.75}
          roughness={0.28}
        />
      </mesh>
    </group>
  );
}

function ProjectionCone() {
  return (
    <group position={[1.75, -3.05, 0.1]} rotation={[0, -0.38, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.38, 0.62, 1.35, 36]} />
        <meshStandardMaterial
          color="#35141a"
          metalness={0.78}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.09, 36]} />
        <meshStandardMaterial
          color="#78b7c8"
          metalness={0.45}
          roughness={0.05}
        />
      </mesh>
    </group>
  );
}

function useMemoryTextures(data: XsoData) {
  const quality = useQuality();
  const urls = useMemo(() => buildMemoryTextureUrls(data), [data]);
  const textures = useLoader(TextureLoader, urls);

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = quality.anisotropy;
      texture.generateMipmaps = quality.tier === 'high';
      texture.needsUpdate = true;
    });
  }, [textures, quality.anisotropy, quality.tier]);

  return textures;
}

function rotateIndices(length: number, start: number) {
  const safe = Math.max(0, Math.min(length - 1, Math.round(start)));
  const values = Array.from({ length }, (_, index) => index);
  return [...values.slice(safe), ...values.slice(0, safe)];
}

function playCue(kind: 'click' | 'clack' | 'rewind' | 'shuffle' | 'crank') {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const now = context.currentTime;

    if (kind === 'rewind') {
      const thunk = context.createOscillator();
      const whir = context.createOscillator();
      const gain = context.createGain();
      const whirGain = context.createGain();
      thunk.type = 'square';
      thunk.frequency.setValueAtTime(85, now);
      thunk.frequency.exponentialRampToValueAtTime(42, now + 0.09);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      whir.type = 'sawtooth';
      whir.frequency.setValueAtTime(190, now);
      whir.frequency.linearRampToValueAtTime(320, now + 0.14);
      whirGain.gain.setValueAtTime(0.025, now);
      whirGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      thunk.connect(gain);
      whir.connect(whirGain);
      gain.connect(context.destination);
      whirGain.connect(context.destination);
      thunk.start(now);
      whir.start(now);
      thunk.stop(now + 0.11);
      whir.stop(now + 0.17);
      whir.addEventListener('ended', () => void context.close());
      return;
    }

    if (kind === 'crank') {
      const clack = context.createOscillator();
      const ratchet = context.createOscillator();
      const gain = context.createGain();
      const ratchetGain = context.createGain();
      clack.type = 'square';
      clack.frequency.setValueAtTime(95, now);
      clack.frequency.exponentialRampToValueAtTime(55, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      ratchet.type = 'triangle';
      ratchet.frequency.setValueAtTime(240, now);
      ratchet.frequency.linearRampToValueAtTime(120, now + 0.14);
      ratchetGain.gain.setValueAtTime(0.04, now);
      ratchetGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      clack.connect(gain);
      ratchet.connect(ratchetGain);
      gain.connect(context.destination);
      ratchetGain.connect(context.destination);
      clack.start(now);
      ratchet.start(now);
      clack.stop(now + 0.1);
      ratchet.stop(now + 0.16);
      clack.addEventListener('ended', () => void context.close());
      return;
    }

    if (kind === 'shuffle') {
      // Soft paper-slide whisper
      const slide = context.createOscillator();
      const rustle = context.createOscillator();
      const gain = context.createGain();
      const rustleGain = context.createGain();
      slide.type = 'triangle';
      slide.frequency.setValueAtTime(140, now);
      slide.frequency.exponentialRampToValueAtTime(70, now + 0.18);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      rustle.type = 'sawtooth';
      rustle.frequency.setValueAtTime(420, now);
      rustle.frequency.linearRampToValueAtTime(180, now + 0.12);
      rustleGain.gain.setValueAtTime(0.018, now);
      rustleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      slide.connect(gain);
      rustle.connect(rustleGain);
      gain.connect(context.destination);
      rustleGain.connect(context.destination);
      slide.start(now);
      rustle.start(now);
      slide.stop(now + 0.22);
      rustle.stop(now + 0.15);
      slide.addEventListener('ended', () => void context.close());
      return;
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const frequency = kind === 'click' ? 260 : 110;
    const duration = kind === 'clack' ? 0.12 : 0.07;

    oscillator.type = kind === 'clack' ? 'square' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(45, frequency * 0.45),
      now + duration,
    );
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
    oscillator.addEventListener('ended', () => void context.close());
  } catch {
    // Audio is optional tactile feedback.
  }
}

export default R3FUnifiedViewer;
