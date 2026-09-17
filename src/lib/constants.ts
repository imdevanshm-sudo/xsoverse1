import type { ThemeId, ThemeTokens } from './types';

export const THEMES: Record<ThemeId, ThemeTokens> = {
  classic: {
    id: 'classic',
    label: 'Classic Thermal',
    paper: '#f3efe6',
    ink: '#1a1814',
    muted: '#3a352e',
    accent: '#1a1814',
    grainOpacity: 0.14,
  },
  y2k: {
    id: 'y2k',
    label: 'Y2K Pink',
    paper: '#ffe4f1',
    ink: '#c1177a',
    muted: '#a33a74',
    accent: '#ff4db8',
    grainOpacity: 0.1,
  },
  cyber: {
    id: 'cyber',
    label: 'Cyber Matrix',
    paper: '#071428',
    ink: '#00f5ff',
    muted: '#66d9e8',
    accent: '#39ff14',
    grainOpacity: 0.2,
  },
  dark: {
    id: 'dark',
    label: 'Dark Thermal',
    paper: '#1c1a17',
    ink: '#f4efe6',
    muted: '#c9c0b2',
    accent: '#f4efe6',
    grainOpacity: 0.16,
  },
};

export const VIBES = [
  'Chaotic Evil',
  'Wholesome',
  'Dramatic',
  'Unfiltered Bestie',
] as const;

export const DEFAULT_LINE_ITEMS = [
  { qty: '42x', description: 'LATE-NIGHT BOBA RUNS', price: '$69.00' },
  { qty: '150h', description: 'BEING YOUR THERAPIST', price: 'UNPAID' },
  { qty: '3x', description: 'ALMOST GOT ARRESTED', price: 'LORE' },
  { qty: '247x', description: 'TIKTOKS SENT AT 2AM', price: 'CHAOS' },
  { qty: '1', description: 'SHARED BRAIN CELL FEE', price: 'FRAGILE' },
  { qty: '∞', description: '100% LOYALTY SURCHARGE', price: 'OWED' },
];

export function clampDescription(text: string, max = 28): string {
  const upper = text.toUpperCase().replace(/\s+/g, ' ').trim();
  if (upper.length <= max) return upper;
  return `${upper.slice(0, max - 1)}…`;
}

export function formatTimestamp(date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${mm}/${dd}/${yyyy} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

export function newId(): string {
  return `li_${Math.random().toString(36).slice(2, 10)}`;
}
