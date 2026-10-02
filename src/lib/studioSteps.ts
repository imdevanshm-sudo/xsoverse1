/** Studio steps read as reconstructing a timeline; `card` is the keepsake each step edits. */
export const STUDIO_STEPS = [
  { id: 'receipt', label: 'Set the Scene', short: 'Scene', cardName: 'Receipt', card: 0 },
  { id: 'audit', label: 'Recall the Details', short: 'Details', cardName: 'Audit', card: 1 },
  { id: 'photos', label: 'Frame the Faces', short: 'Faces', cardName: 'Photos', card: 2 },
  { id: 'letter', label: 'Leave the Note', short: 'Note', cardName: 'Letter', card: 3 },
] as const;

export type StudioStepId = (typeof STUDIO_STEPS)[number]['id'];
