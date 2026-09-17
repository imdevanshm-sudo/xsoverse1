'use client';

import { createContext, useContext } from 'react';
import {
  getCanvasQualityProfile,
  type CanvasQualityProfile,
} from '@/lib/deviceQuality';

const QualityContext = createContext<CanvasQualityProfile>(
  getCanvasQualityProfile('high'),
);

export const QualityProvider = QualityContext.Provider;

export function useQuality(): CanvasQualityProfile {
  return useContext(QualityContext);
}
