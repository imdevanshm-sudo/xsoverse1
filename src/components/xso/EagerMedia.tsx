'use client';

import { createContext, useContext, type ReactNode } from 'react';

const EagerMediaContext = createContext(false);

/**
 * Inside an opened gift every photo was already downloaded and decoded during the unwrap, so
 * media loads eagerly from those exact URLs instead of lazily from resized copies mid-animation.
 */
export function EagerMedia({ children }: { children: ReactNode }) {
  return <EagerMediaContext.Provider value>{children}</EagerMediaContext.Provider>;
}

export function useEagerMedia() {
  return useContext(EagerMediaContext);
}
