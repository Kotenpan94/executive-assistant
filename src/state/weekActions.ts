// Pure updates to a StudentWeek. These stand in for backend writes.

import type { WorkItem } from '../engine/resolveNow';
import type { CheckIn, Step, StudentWeek } from '../types';

const MINUTE = 60 * 1000;
/** Length of the first piece created by "Break it smaller". */
export const SMALL_PIECE_MINUTES = 15;

function shiftIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function markDone(week: StudentWeek, item: WorkItem, now: Date): StudentWeek {
  const checkIn: CheckIn = {
    id: `checkin-${item.id}-${now.getTime()}`,
    studentId: week.student.id,
    subjectType: item.kind === 'step' ? 'step' : 'task',
    subjectId: item.id,
    kind: 'completion',
    sharedWithSupporters: true, // §8 default for completion check-ins
    createdAt: now.toISOString(),
  };
  return {
    ...week,
    steps: week.steps.map((s) => (s.id === item.id ? { ...s, status: 'done' } : s)),
    tasks: week.tasks.map((t) => (t.id === item.id ? { ...t, status: 'done' } : t)),
    checkIns: [...week.checkIns, checkIn],
  };
}

/** Takes it off the plan without moving it. Steps become 'skipped'; atomic tasks lose their slot but stay open. */
export function skip(week: StudentWeek, item: WorkItem): StudentWeek {
  return {
    ...week,
    steps: week.steps.map((s) => (s.id === item.id ? { ...s, status: 'skipped' } : s)),
    tasks: week.tasks.map((t) => (t.id === item.id ? { ...t, plannedStart: undefined, plannedEnd: undefined } : t)),
  };
}

export function moveToTomorrow(week: StudentWeek, item: WorkItem): StudentWeek {
  return {
    ...week,
    steps: week.steps.map((s) =>
      s.id === item.id ? { ...s, plannedStart: shiftIso(s.plannedStart, 1), plannedEnd: shiftIso(s.plannedEnd, 1) } : s,
    ),
    tasks: week.tasks.map((t) =>
      t.id === item.id && t.plannedStart && t.plannedEnd
        ? { ...t, plannedStart: shiftIso(t.plannedStart, 1), plannedEnd: shiftIso(t.plannedEnd, 1) }
        : t,
    ),
  };
}

/**
 * "Break it smaller": the student names a small first piece, which is
 * scheduled for the next 15 minutes starting now. The rest keeps its original
 * time slot but moves to tomorrow.
 *
 * This is a placeholder rule until the breakdown engine (§5–6) exists.
 */
export function breakSmaller(week: StudentWeek, item: WorkItem, pieceTitle: string, now: Date): StudentWeek {
  const start = new Date(now);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + SMALL_PIECE_MINUTES * MINUTE);

  const parent =
    item.kind === 'step'
      ? { parentType: item.step.parentType, parentId: item.step.parentId }
      : { parentType: 'task' as const, parentId: item.id };

  const piece: Step = {
    id: `${item.id}-piece-${now.getTime()}`,
    studentId: week.student.id,
    ...parent,
    title: pieceTitle.trim(),
    plannedStart: start.toISOString(),
    plannedEnd: end.toISOString(),
    status: 'planned',
  };

  if (item.kind === 'step') {
    const moved = moveToTomorrow(week, item);
    return { ...moved, steps: [...moved.steps, piece] };
  }

  // An atomic task that now has Steps is no longer scheduled on its own, so its
  // remainder becomes a Step too, in tomorrow's version of the original slot.
  const rest: Step = {
    ...piece,
    id: `${item.id}-rest-${now.getTime()}`,
    title: `Rest of: ${item.title}`,
    plannedStart: shiftIso(item.start.toISOString(), 1),
    plannedEnd: shiftIso(item.end.toISOString(), 1),
  };
  return { ...week, steps: [...week.steps, piece, rest] };
}

export function confirmDueDate(week: StudentWeek, assignmentId: string): StudentWeek {
  return {
    ...week,
    assignments: week.assignments.map((a) => (a.id === assignmentId ? { ...a, extraction: 'confirmed' } : a)),
  };
}

/** Corrects a due date. A date the student set counts as confirmed. */
export function setDueDate(week: StudentWeek, assignmentId: string, dueAt: Date): StudentWeek {
  return {
    ...week,
    assignments: week.assignments.map((a) =>
      a.id === assignmentId ? { ...a, dueAt: dueAt.toISOString(), extraction: 'confirmed' } : a,
    ),
  };
}
