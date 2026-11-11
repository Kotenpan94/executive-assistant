import React, { createContext, useContext, useState } from 'react';
import { buildMockWeek } from '../mocks/week';
import type { StudentWeek } from '../types';

// Holds the student's week for every tab. In memory only: it resets when the
// app reloads. Swap in on-device storage or a backend here later.

interface WeekContextValue {
  week: StudentWeek;
  setWeek: React.Dispatch<React.SetStateAction<StudentWeek>>;
}

const WeekContext = createContext<WeekContextValue | null>(null);

export function WeekProvider({ children }: { children: React.ReactNode }) {
  const [week, setWeek] = useState(() => buildMockWeek(new Date()));
  return <WeekContext.Provider value={{ week, setWeek }}>{children}</WeekContext.Provider>;
}

export function useWeek(): WeekContextValue {
  const ctx = useContext(WeekContext);
  if (!ctx) throw new Error('useWeek must be used inside WeekProvider');
  return ctx;
}
