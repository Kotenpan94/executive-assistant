// Turns a reviewed ExtractionResult into records on the student's week.
//
// Placement is deliberately simple (a stand-in for the scheduling engine in
// DESIGN.md §5–6): each suggested step goes into the first free slot between
// 3 and 9 PM on its target day, moving earlier day by day until one fits.

import { mondayOf } from '../mocks/week';
import type { Assignment, Class, Commitment, Document, Step, StudentWeek, Weekday } from '../types';
import type { ExtractedItem, ExtractionResult, UploadKind } from '../types/extraction';

const MINUTE = 60_000;
const SLOT_START_HOUR = 15;
const SLOT_END_HOUR = 21;
const SLOT_STEP_MINUTES = 30;
const WEEKDAY_INDEX: Record<Weekday, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

/** Local Date from "YYYY-MM-DD" and optional "HH:MM". No time means 11:59 PM. */
export function parseLocalDateTime(date: string, time: string | null): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!d) return null;
  const t = time ? /^(\d{1,2}):(\d{2})$/.exec(time) : null;
  const result = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), t ? Number(t[1]) : 23, t ? Number(t[2]) : 59);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function itemDueAt(item: ExtractedItem): Date | null {
  return item.dueDate ? parseLocalDateTime(item.dueDate, item.dueTime) : null;
}

/** A known class whose name matches, ignoring case and spacing. */
export function matchClass(week: StudentWeek, name: string | null): Class | undefined {
  if (!name) return undefined;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return week.classes.find((c) => norm(c.name) === norm(name));
}

export function isAlreadyPlanned(week: StudentWeek, item: ExtractedItem, classId: string | undefined): boolean {
  const title = item.title.toLowerCase().trim();
  return week.assignments.some((a) => a.title.toLowerCase().trim() === title && (!classId || a.classId === classId));
}

// ── Free-slot search ──────────────────────────────────────────────────────

type Busy = { start: number; end: number };

function busyTimes(week: StudentWeek): Busy[] {
  const busy: Busy[] = week.commitments.map((c) => ({ start: Date.parse(c.startsAt), end: Date.parse(c.endsAt) }));
  for (const s of week.steps) if (s.status === 'planned') busy.push({ start: Date.parse(s.plannedStart), end: Date.parse(s.plannedEnd) });
  for (const t of week.tasks) {
    if (t.status === 'open' && t.plannedStart && t.plannedEnd) busy.push({ start: Date.parse(t.plannedStart), end: Date.parse(t.plannedEnd) });
  }
  return busy;
}

function findSlotOnDay(busy: Busy[], day: Date, minutes: number, notBefore: Date, notAfter: Date): Date | null {
  for (let h = SLOT_START_HOUR * 60; h + minutes <= SLOT_END_HOUR * 60; h += SLOT_STEP_MINUTES) {
    const start = new Date(day);
    start.setHours(0, h, 0, 0);
    const end = new Date(start.getTime() + minutes * MINUTE);
    if (start < notBefore || end > notAfter) continue;
    if (busy.some((b) => start.getTime() < b.end && b.start < end.getTime())) continue;
    return start;
  }
  return null;
}

/** First free slot on `target`, else the day before, and so on back to today. */
function placeStep(busy: Busy[], target: Date, minutes: number, now: Date, dueAt: Date): Date | null {
  const day = new Date(target);
  day.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (day < today) day.setTime(today.getTime());
  while (day >= today) {
    const slot = findSlotOnDay(busy, day, minutes, now, dueAt);
    if (slot) return slot;
    day.setDate(day.getDate() - 1);
  }
  return null;
}

// ── Import ────────────────────────────────────────────────────────────────

export interface ImportChoices {
  /** Indexes into result.dueItems. */
  items: number[];
  /** Indexes into result.classMeetings. */
  meetings: number[];
  includeSteps: boolean;
}

export interface ImportSummary {
  assignments: number;
  steps: number;
  unplacedSteps: number;
  meetings: number;
  newClassName: string | null;
}

export function importExtraction(
  week: StudentWeek,
  result: ExtractionResult,
  choices: ImportChoices,
  upload: { fileName: string; uri: string; kind: UploadKind },
  now: Date,
): { week: StudentWeek; summary: ImportSummary } {
  const stamp = now.getTime();
  const studentId = week.student.id;

  // Class: reuse a matching one, or create it if anything will need it.
  let cls = matchClass(week, result.className);
  const classes = [...week.classes];
  let newClassName: string | null = null;
  if (!cls && (choices.items.length > 0 || choices.meetings.length > 0)) {
    cls = { id: `class-${stamp}`, studentId, name: result.className ?? result.title };
    classes.push(cls);
    newClassName = cls.name;
  }

  const document: Document = {
    id: `doc-${stamp}`,
    studentId,
    classId: cls?.id,
    type: result.documentKind === 'syllabus' || result.documentKind === 'schedule' ? result.documentKind : 'assignment',
    fileUrl: upload.uri,
    status: 'reviewed',
    createdAt: now.toISOString(),
  };

  // Class times first, so suggested steps get placed around them.
  const commitments = cls ? buildMeetings(result, choices.meetings, cls.id, studentId, now, stamp) : [];

  const assignments: Assignment[] = [];
  const steps: Step[] = [];
  const busy = busyTimes({ ...week, commitments: [...week.commitments, ...commitments] });
  let unplacedSteps = 0;

  for (const index of choices.items) {
    const item = result.dueItems[index];
    const dueAt = item ? itemDueAt(item) : null;
    if (!item || !dueAt || !cls) continue;

    const assignment: Assignment = {
      id: `a-${stamp}-${index}`,
      studentId,
      classId: cls.id,
      title: item.title,
      dueAt: dueAt.toISOString(),
      stakes: item.stakes,
      source: result.documentKind === 'syllabus' ? 'syllabus' : 'upload',
      documentId: document.id,
      // The student reviewed this list, but a low-confidence date still gets the "check this date" banner.
      extraction: item.confidence === 'high' ? 'confirmed' : 'needs-review',
      status: 'open',
    };
    assignments.push(assignment);

    if (!choices.includeSteps) continue;
    // Furthest-out steps first, so earlier steps land before later ones.
    const ordered = [...item.suggestedSteps].sort((a, b) => b.daysBeforeDue - a.daysBeforeDue);
    ordered.forEach((s, i) => {
      const target = new Date(dueAt);
      target.setDate(target.getDate() - Math.max(0, s.daysBeforeDue));
      const minutes = Math.min(Math.max(s.minutes, 10), 120);
      const start = placeStep(busy, target, minutes, now, dueAt);
      if (!start) {
        unplacedSteps++;
        return;
      }
      const end = new Date(start.getTime() + minutes * MINUTE);
      busy.push({ start: start.getTime(), end: end.getTime() });
      steps.push({
        id: `s-${stamp}-${index}-${i}`,
        studentId,
        parentType: 'assignment',
        parentId: assignment.id,
        title: s.title,
        plannedStart: start.toISOString(),
        plannedEnd: end.toISOString(),
        status: 'planned',
      });
    });
  }

  return {
    week: {
      ...week,
      classes,
      assignments: [...week.assignments, ...assignments],
      steps: [...week.steps, ...steps],
      commitments: [...week.commitments, ...commitments],
      documents: [...week.documents, document],
    },
    summary: {
      assignments: assignments.length,
      steps: steps.length,
      unplacedSteps,
      meetings: choices.meetings.length,
      newClassName,
    },
  };
}

/** Class meetings for this week and next, as fixed commitments. */
function buildMeetings(
  result: ExtractionResult,
  indexes: number[],
  classId: string,
  studentId: string,
  now: Date,
  stamp: number,
): Commitment[] {
  const commitments: Commitment[] = [];
  const monday = mondayOf(now);
  for (const index of indexes) {
    const m = result.classMeetings[index];
    if (!m) continue;
    for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
      for (const day of m.days) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + weekOffset * 7 + WEEKDAY_INDEX[day]);
        const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const startsAt = parseLocalDateTime(ymd, m.startTime);
        const endsAt = parseLocalDateTime(ymd, m.endTime);
        if (!startsAt || !endsAt || endsAt <= startsAt) continue;
        commitments.push({
          id: `c-${stamp}-${index}-${weekOffset}-${day}`,
          studentId,
          classId,
          title: m.title,
          kind: 'class',
          schedule: 'fixed',
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          placeLabel: m.placeLabel ?? undefined,
        });
      }
    }
  }
  return commitments;
}
