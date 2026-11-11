// Dev-only time presets for the Now screen. Each one fakes the clock to a
// moment in the mock week, and some also adjust the data so the screen shows
// a specific state.

import type { StudentWeek } from '../types';
import { atThisWeek } from './week';

export interface DevScenario {
  id: string;
  label: string;
  /** What the Now screen should show. Used as the chip's accessibility hint. */
  expect: string;
  now: (realNow: Date) => Date;
  prepare?: (week: StudentWeek) => StudentWeek;
}

const MON = 0, THU = 3;

export const DEV_SCENARIOS: DevScenario[] = [
  {
    id: 'commitment',
    label: 'In class',
    expect: 'Mon 9:15 AM, inside Bio 101',
    now: (real) => atThisWeek(real, MON, 9, 15),
  },
  {
    id: 'gap',
    label: 'Free gap',
    expect: 'Mon 11:30 AM, nothing until English Comp at 1:00',
    now: (real) => atThisWeek(real, MON, 11, 30),
  },
  {
    id: 'work',
    label: 'Planned step',
    expect: 'Mon 3:10 PM, inside the chapter 4 reading block',
    now: (real) => atThisWeek(real, MON, 15, 10),
  },
  {
    id: 'missed',
    label: 'Missed step',
    expect: "Mon 4:30 PM, the 3:00 reading block passed with nothing recorded",
    now: (real) => atThisWeek(real, MON, 16, 30),
  },
  {
    id: 'done-for-day',
    label: 'Nothing left today',
    expect: "Thu 4:00 PM, today's only step already done",
    now: (real) => atThisWeek(real, THU, 16, 0),
    prepare: (week) => ({
      ...week,
      steps: week.steps.map((s) => (s.id === 's-eng-2' ? { ...s, status: 'done' } : s)),
    }),
  },
];
