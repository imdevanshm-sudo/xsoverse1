export const STUDIO_STEPS = [
  { id: 'receipt', label: 'Receipt', card: 0 },
  { id: 'audit', label: 'Audit', card: 1 },
  { id: 'photos', label: 'Photos', card: 2 },
  { id: 'letter', label: 'Letter & offer', card: 3 },
] as const;

export type StudioStepId = (typeof STUDIO_STEPS)[number]['id'];
