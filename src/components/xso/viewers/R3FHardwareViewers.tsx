'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { motion } from 'framer-motion';
import {
  Group,
  MathUtils,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three';
import type { XsoData } from '@/types/xso';
import { playMechanicalCue, SPRING } from './shared';
import type { ViewerEngineProps } from './StackViewers';

const FALLBACK_TEXTURE =
  'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="240"%3E%3Crect width="100%25" height="100%25" fill="%23231b22"/%3E%3C/svg%3E';

export function R3FViewMasterViewer({
  data,
  initialSide = 0,
}: ViewerEngineProps) {
  const [turn, setTurn] = useState(
    Math.max(0, Math.min(3, Math.round(initialSide))),
  );

  const pullLever = () => {
    playMechanicalCue('click');
    setTurn((value) => value + 1);
  };

  return (
    <HardwareStage label="3D mechanical View-Master">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 8.8], fov: 38 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'default' }}
      >
        <ViewMasterScene photos={data.photos} turn={turn} />
      </Canvas>
      <motion.button
        type="button"
        onClick={pullLever}
        animate={{ rotateX: turn * 10 }}
        whileTap={{ y: 18, rotateZ: 4 }}
        transition={SPRING}
        className="absolute bottom-8 right-8 z-20 h-28 w-12 origin-top rounded-b-2xl border-4 border-[#2a070e] bg-gradient-to-r from-[#8d142b] via-[#d33a50] to-[#791126] shadow-[5px_8px_0_#21050b]"
        aria-label="Pull 3D View-Master lever"
      >
        <span className="font-mono text-[8px] font-bold uppercase text-white/75">
          Pull
        </span>
      </motion.button>
      <HardwareLabel>
        Stereo frame {(turn % 4) + 1} / 4 · 90° disc
      </HardwareLabel>
    </HardwareStage>
  );
}

export function R3FMovieBoxViewer({
  data,
  initialSide = 0,
}: ViewerEngineProps) {
  const [turn, setTurn] = useState(
    Math.max(0, Math.min(3, Math.round(initialSide))),
  );

  const crank = () => {
    playMechanicalCue('clack');
    setTurn((value) => value + 1);
  };

  return (
    <HardwareStage
      label="3D old movie box projector"
      className="border-[#3f1220] bg-[radial-gradient(circle_at_50%_38%,#4d1b2a_0%,#1a090f_50%,#090407_100%)] shadow-[inset_0_0_55px_#000,0_22px_55px_rgba(0,0,0,.5)]"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 9.5], fov: 40 }}
        gl={{ antialias: false, alpha: true, powerPreference: 'default' }}
      >
        <MovieBoxScene photos={data.photos} turn={turn} />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(255,188,125,.09),transparent_42%,rgba(0,0,0,.45)_100%)]"
        aria-hidden
      />
      <motion.button
        type="button"
        onClick={crank}
        animate={{ rotate: turn * 180 }}
        transition={SPRING}
        className="absolute bottom-9 right-10 z-20 h-16 w-16 rounded-full border-4 border-[#19090d] bg-gradient-to-br from-[#9d5b42] to-[#54241d] shadow-[5px_7px_0_#16080b]"
        aria-label="Turn 3D projector crank"
      >
        <span className="absolute left-1/2 top-1/2 h-2 w-20 -translate-y-1/2 rounded-full bg-[#c88d6b] shadow-md">
          <span className="absolute -right-3 -top-2 h-6 w-6 rounded-full border-2 border-[#27100d] bg-[#e3b28b]" />
        </span>
      </motion.button>
      <HardwareLabel>
        35mm frame {(turn % 4) + 1} / 4 · turn crank
      </HardwareLabel>
    </HardwareStage>
  );
}

function ViewMasterScene({ photos, turn }: { photos: string[]; turn: number }) {
  const textures = usePhotoTextures(photos);

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[4, 5, 7]} intensity={4} color="#fff2e8" />
      <pointLight position={[-4, -2, 4]} intensity={18} color="#f62d57" />

      <group position={[0, 0.15, 0]}>
        <MoldedChassis />
        <StereoDisc textures={textures} turn={turn} />
        <Lens
          position={[-1.35, 0.65, 1.12]}
          texture={textures[turn % textures.length]}
        />
        <Lens
          position={[1.35, 0.65, 1.12]}
          texture={textures[(turn + 1) % textures.length]}
        />
      </group>
    </>
  );
}

function MoldedChassis() {
  return (
    <group position={[0, 0, -0.35]}>
      <mesh scale={[3.75, 2.75, 0.72]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial
          color="#a91f38"
          roughness={0.28}
          metalness={0.08}
        />
      </mesh>
      <mesh position={[0, -1.9, 0]} scale={[2.2, 0.9, 0.6]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#761126" roughness={0.38} />
      </mesh>
      <mesh position={[0, 2.1, 0.2]} scale={[1.55, 0.28, 0.38]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#310710" roughness={0.55} />
      </mesh>
    </group>
  );
}

function StereoDisc({ textures, turn }: { textures: Texture[]; turn: number }) {
  const carousel = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!carousel.current) return;
    carousel.current.rotation.y = MathUtils.damp(
      carousel.current.rotation.y,
      -turn * (Math.PI / 2),
      7,
      delta,
    );
  });

  return (
    <group ref={carousel} position={[0, -0.25, 0.45]}>
      {Array.from({ length: 4 }).map((_, faceIndex) => {
        const angle = faceIndex * (Math.PI / 2);
        return (
          <group
            key={faceIndex}
            position={[
              Math.sin(angle) * 0.28,
              0,
              Math.cos(angle) * 0.28,
            ]}
            rotation={[0, angle, 0]}
          >
            <mesh>
              <circleGeometry args={[2.45, 64]} />
              <meshStandardMaterial color="#100e10" roughness={0.72} />
            </mesh>
            {textures.map((texture, index) => {
              const photoAngle = index * (Math.PI / 2) + Math.PI / 4;
              return (
                <mesh
                  key={texture.uuid}
                  position={[
                    Math.cos(photoAngle) * 1.25,
                    Math.sin(photoAngle) * 1.25,
                    0.035,
                  ]}
                  rotation={[0, 0, photoAngle - Math.PI / 2]}
                >
                  <planeGeometry args={[1.22, 0.9]} />
                  <meshBasicMaterial map={texture} toneMapped={false} />
                </mesh>
              );
            })}
            <mesh position={[0, 0, 0.07]}>
              <circleGeometry args={[0.38, 32]} />
              <meshStandardMaterial color="#554c50" metalness={0.65} roughness={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Lens({
  position,
  texture,
}: {
  position: [number, number, number];
  texture: Texture;
}) {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.88, 1.04, 0.34, 48]} />
        <meshStandardMaterial color="#26050c" roughness={0.32} />
      </mesh>
      <mesh position={[0, 0, 0.19]}>
        <circleGeometry args={[0.69, 48]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.205]}>
        <circleGeometry args={[0.69, 48]} />
        <meshStandardMaterial
          color="#a8d6e6"
          transparent
          opacity={0.16}
          metalness={0.25}
          roughness={0.05}
        />
      </mesh>
    </group>
  );
}

function MovieBoxScene({ photos, turn }: { photos: string[]; turn: number }) {
  const textures = usePhotoTextures(photos);

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 6, 7]} intensity={4.2} color="#ffe2d1" />
      <pointLight position={[-3, 0, 4]} intensity={18} color="#a52f4a" />
      <spotLight
        position={[0, 1.5, 7]}
        intensity={32}
        angle={0.48}
        penumbra={0.82}
        color="#ffd3a3"
      />

      <group position={[0, 0.15, 0]}>
        <ProjectorHousing />
        <FilmStrip textures={textures} turn={turn} />
        <ProjectionLens />
      </group>
    </>
  );
}

function ProjectorHousing() {
  return (
    <group>
      <mesh position={[0, 0, -0.7]} scale={[3.8, 2.8, 0.85]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#4b1221"
          roughness={0.2}
          metalness={0.78}
        />
      </mesh>
      <mesh position={[0, 0, 0.17]} scale={[3.25, 2.25, 0.24]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#080508" metalness={0.38} roughness={0.5} />
      </mesh>
      {[
        { position: [0, 2.5, 0.12] as const, scale: [3.55, 0.22, 0.3] as const },
        { position: [0, -2.5, 0.12] as const, scale: [3.55, 0.22, 0.3] as const },
        { position: [-3.5, 0, 0.12] as const, scale: [0.22, 2.5, 0.3] as const },
        { position: [3.5, 0, 0.12] as const, scale: [0.22, 2.5, 0.3] as const },
      ].map((bar, index) => (
        <mesh key={index} position={bar.position} scale={bar.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color="#6b2031"
            metalness={0.84}
            roughness={0.2}
          />
        </mesh>
      ))}
      {[-3.34, 3.34].flatMap((x) =>
        Array.from({ length: 9 }).map((_, index) => (
          <mesh
            key={`${x}-${index}`}
            position={[x, 1.9 - index * 0.48, 0.38]}
            scale={[0.18, 0.28, 0.08]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#080506" />
          </mesh>
        )),
      )}
    </group>
  );
}

function FilmStrip({ textures, turn }: { textures: Texture[]; turn: number }) {
  const strip = useRef<Group>(null);
  const offset = turn % textures.length;

  useFrame((_, delta) => {
    if (!strip.current) return;
    strip.current.position.y = MathUtils.damp(
      strip.current.position.y,
      offset * 1.85,
      8,
      delta,
    );
  });

  return (
    <group ref={strip} position={[0, 0, 0.58]}>
      {textures.map((texture, index) => (
        <group key={texture.uuid} position={[0, -index * 1.85, 0]}>
          <mesh>
            <planeGeometry args={[5.55, 1.62]} />
            <meshBasicMaterial color="#100d0f" />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[4.6, 1.26]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
          </mesh>
          {[-2.52, 2.52].flatMap((x) =>
            Array.from({ length: 5 }).map((_, hole) => (
              <mesh
                key={`${x}-${hole}`}
                position={[x, 0.58 - hole * 0.29, 0.045]}
                scale={[0.13, 0.09, 1]}
              >
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#c3a875" />
              </mesh>
            )),
          )}
        </group>
      ))}
    </group>
  );
}

function ProjectionLens() {
  return (
    <group position={[2.85, -1.9, 0.25]} rotation={[0, -0.38, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[0.38, 0.58, 1.25, 36]} />
        <meshStandardMaterial color="#35141a" metalness={0.72} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.08, 36]} />
        <meshStandardMaterial color="#7dc4d5" metalness={0.35} roughness={0.05} />
      </mesh>
    </group>
  );
}

function usePhotoTextures(photos: string[]) {
  const urls = useMemo(() => {
    const normalized = photos.filter(Boolean).slice(0, 4);
    while (normalized.length < 4) normalized.push(FALLBACK_TEXTURE);
    return normalized;
  }, [photos]);
  const textures = useLoader(TextureLoader, urls);

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
    });
  }, [textures]);

  return textures;
}

function HardwareStage({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative h-[620px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#10070b] ${className}`}
      aria-label={label}
    >
      {children}
    </section>
  );
}

function HardwareLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="pointer-events-none absolute bottom-5 left-7 z-20 font-mono text-[9px] uppercase tracking-[0.16em] text-white/55">
      {children}
    </p>
  );
}
