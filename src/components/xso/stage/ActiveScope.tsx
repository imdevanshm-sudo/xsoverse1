'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const Active = createContext(true);

/**
 * Marks a subtree as in front of the viewer (the top card, the open fold, the unwrapped gift).
 * Scopes nest: a card is only active if everything around it is too. Outside any scope, content
 * counts as active.
 */
export function ActiveScope({ active, children }: { active: boolean; children: ReactNode }) {
  const parent = useContext(Active);
  return <Active.Provider value={parent && active}>{children}</Active.Provider>;
}

/** Turns true the first time this content is in front, and stays true. */
export function useFirstActive(): boolean {
  const active = useContext(Active);
  const [seen, setSeen] = useState(active);
  useEffect(() => {
    if (active) setSeen(true);
  }, [active]);
  return seen || active;
}
