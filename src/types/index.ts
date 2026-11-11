// Data model types — see DESIGN.md §4.
//
// The four entities listed explicitly in §4 (CheckIn, Document, Reminder,
// Notification) follow the doc. The rest (Student, Supporter, Class,
// Commitment, Assignment, Task, Step, Routine, StudentSupporterLink) are
// inferred from how the doc references them elsewhere and should be
// reconciled once §3–6 are filled in.

export type ID = string;
/** ISO-8601 timestamp, e.g. "2026-11-02T14:00:00.000Z". Strings so they serialize cleanly later. */
export type ISODateTime = string;
/** 24h wall-clock time, e.g. "23:00". */
export type ClockTime = string;

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// ── People ────────────────────────────────────────────────────────────────

export interface Student {
  id: ID;
  displayName: string;
  /** §7: student-chosen day for the weekly planning session. */
  planningDay: Weekday;
  /** §9: non-critical nudges are suppressed inside this window. */
  quietHours: { start: ClockTime; end: ClockTime };
}

export interface Supporter {
  id: ID;
  displayName: string;
  email: string;
}

/** §10: many-to-many; the student invites and revokes. */
export interface StudentSupporterLink {
  id: ID;
  studentId: ID;
  supporterId: ID;
  status: 'invited' | 'active' | 'revoked';
  /** View-only is the only permission level for now (§10). */
  permission: 'view';
  createdAt: ISODateTime;
}

// ── Calendar ──────────────────────────────────────────────────────────────

export interface Class {
  id: ID;
  studentId: ID;
  name: string;
}

/**
 * A fixed commitment on the calendar (class, work shift, appointment).
 * One record per occurrence. `schedule: 'variable'` marks instances that
 * change week to week (e.g. shifts) and get confirmed in the planning session (§7).
 */
export interface Commitment {
  id: ID;
  studentId: ID;
  classId?: ID;
  title: string;
  kind: 'class' | 'shift' | 'appointment' | 'other';
  schedule: 'fixed' | 'variable';
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  /** A place label only — never coordinates (§1). */
  placeLabel?: string;
}

// ── Work ──────────────────────────────────────────────────────────────────

export type WorkStatus = 'open' | 'done';

export interface Assignment {
  id: ID;
  studentId: ID;
  classId: ID;
  title: string;
  dueAt: ISODateTime;
  /** Higher-stakes items feed the retrospective questions (§7.1). */
  stakes: 'low' | 'medium' | 'high';
  /** 'upload' = read from an uploaded document other than a syllabus, e.g. an assignment sheet. */
  source: 'manual' | 'syllabus' | 'upload';
  /** The uploaded Document this came from, if any. */
  documentId?: ID;
  /** §1: an unconfirmed AI guess is surfaced for the student to confirm, not hidden. */
  extraction?: 'confirmed' | 'needs-review';
  status: WorkStatus;
}

/** A non-class to-do. Without Steps it's an "atomic item" and can be scheduled directly. */
export interface Task {
  id: ID;
  studentId: ID;
  title: string;
  dueAt?: ISODateTime;
  plannedStart?: ISODateTime;
  plannedEnd?: ISODateTime;
  status: WorkStatus;
}

/** A planned work block that breaks down an Assignment or Task. */
export interface Step {
  id: ID;
  studentId: ID;
  parentType: 'assignment' | 'task';
  parentId: ID;
  title: string;
  plannedStart: ISODateTime;
  plannedEnd: ISODateTime;
  /**
   * 'skipped' is a neutral "not now", not a failure. A Step left 'planned'
   * after its window has passed is shown as "still open".
   */
  status: 'planned' | 'done' | 'skipped';
}

/** A reusable chain of steps (e.g. "study for a quiz"). Durations get tuned in Phase 4. */
export interface Routine {
  id: ID;
  studentId: ID;
  name: string;
  steps: { title: string; minutes: number }[];
}

// ── Entities from DESIGN.md §4 ────────────────────────────────────────────

export interface CheckIn {
  id: ID;
  studentId: ID;
  subjectType: 'task' | 'assignment' | 'step';
  subjectId: ID;
  kind: 'completion' | 'location';
  /** Location check-ins store a label like "Library", never coordinates. */
  placeLabel?: string;
  /** §8: defaults to true for completion, false for location. */
  sharedWithSupporters: boolean;
  createdAt: ISODateTime;
}

export interface Document {
  id: ID;
  studentId: ID;
  classId?: ID;
  /** 'assignment' (a take-home assignment) is an addition to DESIGN.md §4. */
  type: 'syllabus' | 'schedule' | 'assignment';
  /** Local file URI for now. There's no file storage yet. */
  fileUrl: string;
  status: 'pending' | 'parsed' | 'reviewed';
  createdAt: ISODateTime;
}

export interface Reminder {
  id: ID;
  targetType: 'student' | 'supporter';
  targetId: ID;
  type: 'due' | 'initiation' | 'missed-followup' | 'planning-session';
  firesAt: ISODateTime;
}

export interface Notification {
  id: ID;
  targetType: 'student' | 'supporter';
  targetId: ID;
  channel: 'push' | 'email';
}

// ── Aggregate used by screens ─────────────────────────────────────────────

/** Everything one student has for a week. Stands in for queries until there's a backend. */
export interface StudentWeek {
  student: Student;
  classes: Class[];
  commitments: Commitment[];
  assignments: Assignment[];
  tasks: Task[];
  steps: Step[];
  checkIns: CheckIn[];
  documents: Document[];
}
