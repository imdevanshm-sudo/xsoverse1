import type { GiftStyle } from '@/types/xso';

export interface StyleOption {
  id: GiftStyle;
  icon: string;
  label: string;
  title: string;
  description: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'loop',
    icon: '🔄',
    label: 'Infinite Loop',
    title: 'The Infinite Loop',
    description: 'An endless, satisfying cycle of memories.',
  },
  {
    id: 'scrapbook',
    icon: '📌',
    label: 'Scrapbook',
    title: 'The Scrapbook',
    description: 'Cards fan out into a messy flat-lay collage at the end.',
  },
  {
    id: 'rewind',
    icon: '↺',
    label: 'Time-Rewind',
    title: 'The Time-Rewind',
    description: 'A magical button recalls discarded papers to the stack.',
  },
  {
    id: 'accordion',
    icon: '🪗',
    label: 'Accordion',
    title: 'The Accordion',
    description: 'Connected postcards pulled as one continuous ribbon.',
  },
  {
    id: 'moviebox',
    icon: '🎞️',
    label: 'Movie Box',
    title: 'The Old Movie Box',
    description: 'A hand crank advances a vintage film-strip projector.',
  },
];
