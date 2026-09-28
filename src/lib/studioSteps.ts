export const STUDIO_STEPS = [
  { id: 'lore', label: 'Lore & Names', short: 'Lore' },
  { id: 'lines', label: 'Line Items', short: 'Items' },
  { id: 'audit', label: 'Audit Stats', short: 'Audit' },
  { id: 'letter', label: 'Photos & Letter', short: 'Letter' },
] as const;

export type StudioStepId = (typeof STUDIO_STEPS)[number]['id'];

export const LAST_STUDIO_STEP = STUDIO_STEPS.length - 1;
