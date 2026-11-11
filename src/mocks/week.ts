// Hardcoded week for one student. Dates are generated relative to the
// current week (Mon–Sun, local time) so the Now screen always has something
// to show. Replace with real queries once there's a backend.

import type { Assignment, Commitment, Step, StudentWeek, Task } from '../types';

const STUDENT_ID = 'student-1';

export function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  d.setDate(d.getDate() - offset);
  return d;
}

/** ISO timestamp for `dayIndex` (0 = Monday) of this week at hh:mm local time. */
function at(monday: Date, dayIndex: number, hh: number, mm = 0): string {
  const d = new Date(monday);
  d.setDate(d.getDate() + dayIndex);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

/** A Date on `dayIndex` (0 = Monday) of the week containing `ref`, at hh:mm local time. */
export function atThisWeek(ref: Date, dayIndex: number, hh: number, mm = 0): Date {
  return new Date(at(mondayOf(ref), dayIndex, hh, mm));
}

export function buildMockWeek(now: Date = new Date()): StudentWeek {
  const mon = mondayOf(now);
  const t = (day: number, hh: number, mm = 0) => at(mon, day, hh, mm);
  const MON = 0, TUE = 1, WED = 2, THU = 3, FRI = 4, SAT = 5, SUN = 6;

  const commitments: Commitment[] = [];
  const addClass = (id: string, classId: string, title: string, days: number[], start: [number, number], end: [number, number], placeLabel: string) => {
    for (const day of days) {
      commitments.push({
        id: `${id}-${day}`,
        studentId: STUDENT_ID,
        classId,
        title,
        kind: 'class',
        schedule: 'fixed',
        startsAt: t(day, ...start),
        endsAt: t(day, ...end),
        placeLabel,
      });
    }
  };
  addClass('bio', 'class-bio', 'Bio 101', [MON, WED, FRI], [9, 0], [9, 50], 'Science Hall 210');
  addClass('calc', 'class-calc', 'Calc I', [TUE, THU], [10, 0], [11, 15], 'Math Building 104');
  addClass('eng', 'class-eng', 'English Comp', [MON, WED], [13, 0], [14, 15], 'Humanities 3');

  // Café shifts change week to week, so they're 'variable'.
  for (const [day, start, end] of [[TUE, 16, 20], [SAT, 11, 16]] as const) {
    commitments.push({
      id: `shift-${day}`,
      studentId: STUDENT_ID,
      title: 'Shift at the café',
      kind: 'shift',
      schedule: 'variable',
      startsAt: t(day, start),
      endsAt: t(day, end),
      placeLabel: 'Campus café',
    });
  }

  const assignments: Assignment[] = [
    {
      id: 'a-bio-quiz',
      studentId: STUDENT_ID,
      classId: 'class-bio',
      title: 'Bio quiz: cell structure',
      dueAt: t(THU, 9, 0),
      stakes: 'high',
      source: 'syllabus',
      extraction: 'confirmed',
      status: 'open',
    },
    {
      id: 'a-calc-ps',
      studentId: STUDENT_ID,
      classId: 'class-calc',
      title: 'Calc problem set 6',
      dueAt: t(FRI, 23, 59),
      stakes: 'medium',
      source: 'syllabus',
      extraction: 'confirmed',
      status: 'open',
    },
    {
      id: 'a-eng-draft',
      studentId: STUDENT_ID,
      classId: 'class-eng',
      title: 'Essay draft',
      dueAt: t(SUN, 23, 59),
      stakes: 'high',
      source: 'syllabus',
      extraction: 'needs-review',
      status: 'open',
    },
  ];

  const tasks: Task[] = [
    {
      id: 't-advisor',
      studentId: STUDENT_ID,
      title: 'Email advisor about spring classes',
      plannedStart: t(WED, 15, 0),
      plannedEnd: t(WED, 15, 15),
      status: 'open',
    },
    {
      id: 't-laundry',
      studentId: STUDENT_ID,
      title: 'Laundry',
      plannedStart: t(SUN, 11, 0),
      plannedEnd: t(SUN, 12, 0),
      status: 'open',
    },
  ];

  const step = (id: string, parentId: string, title: string, day: number, start: [number, number], end: [number, number]): Step => ({
    id,
    studentId: STUDENT_ID,
    parentType: 'assignment',
    parentId,
    title,
    plannedStart: t(day, ...start),
    plannedEnd: t(day, ...end),
    status: 'planned',
  });

  const steps: Step[] = [
    step('s-bio-1', 'a-bio-quiz', 'Read chapter 4, sections 1–2', MON, [15, 0], [15, 45]),
    step('s-calc-1', 'a-calc-ps', 'Problems 1–5', MON, [19, 0], [19, 45]),
    step('s-bio-2', 'a-bio-quiz', 'Read chapter 4, sections 3–4', TUE, [13, 0], [13, 45]),
    step('s-eng-1', 'a-eng-draft', 'Pick a topic and jot three ideas', TUE, [21, 0], [21, 30]),
    step('s-bio-3', 'a-bio-quiz', 'Make flashcards for the diagram terms', WED, [16, 0], [16, 40]),
    step('s-calc-2', 'a-calc-ps', 'Problems 6–10', WED, [19, 30], [20, 15]),
    step('s-bio-4', 'a-bio-quiz', 'Go through flashcards once', WED, [21, 0], [21, 20]),
    step('s-eng-2', 'a-eng-draft', 'Outline the essay', THU, [14, 0], [14, 45]),
    step('s-calc-3', 'a-calc-ps', 'Problems 11–14 and check answers', FRI, [14, 0], [15, 0]),
    step('s-eng-3', 'a-eng-draft', 'Write the intro and first section', SAT, [17, 30], [18, 30]),
    step('s-eng-4', 'a-eng-draft', 'Finish the draft', SUN, [14, 0], [15, 30]),
  ];

  return {
    student: {
      id: STUDENT_ID,
      displayName: 'Sam',
      planningDay: 'sun',
      quietHours: { start: '23:00', end: '07:00' },
    },
    classes: [
      { id: 'class-bio', studentId: STUDENT_ID, name: 'Bio 101' },
      { id: 'class-calc', studentId: STUDENT_ID, name: 'Calc I' },
      { id: 'class-eng', studentId: STUDENT_ID, name: 'English Comp' },
    ],
    commitments,
    assignments,
    tasks,
    steps,
    checkIns: [],
    documents: [],
  };
}
