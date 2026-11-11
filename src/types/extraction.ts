// Contract between the app and the dev extraction server (server/src/index.ts).
// The server's zod schema is checked against these types at compile time,
// so change both together.

import type { Weekday } from './index';

export type UploadKind = 'syllabus' | 'assignment' | 'unsure';

export interface ExtractRequest {
  fileName: string;
  mimeType: string;
  /** File contents, base64-encoded, no data: prefix. */
  base64: string;
  /** What the student said they're uploading. */
  kind: UploadKind;
  /** Device-local date, YYYY-MM-DD, so the model can resolve dates like "Sept 14". */
  today: string;
  /** Names of classes the student already has, so the model can match them. */
  knownClasses: string[];
}

export interface ExtractedStep {
  title: string;
  minutes: number;
  /** How many days before the due date to do this. 0 = the due date itself. */
  daysBeforeDue: number;
}

export interface ExtractedItem {
  title: string;
  kind: 'assignment' | 'exam' | 'quiz' | 'project' | 'reading' | 'other';
  /** YYYY-MM-DD, or null if the document doesn't give one. */
  dueDate: string | null;
  /** HH:MM 24h, or null if the document doesn't give one. */
  dueTime: string | null;
  stakes: 'low' | 'medium' | 'high';
  /** 'low' = the model is guessing; the app asks the student to confirm. */
  confidence: 'high' | 'low';
  /** Student-facing reason for low confidence, e.g. "The syllabus says 'week 6' without a date." */
  confidenceNote: string | null;
  /** Short quote from the document this item came from. */
  sourceText: string;
  /** Only for items due within ~3 weeks of today; otherwise empty. */
  suggestedSteps: ExtractedStep[];
}

export interface ExtractedMeeting {
  title: string;
  days: Weekday[];
  /** HH:MM 24h */
  startTime: string;
  /** HH:MM 24h */
  endTime: string;
  placeLabel: string | null;
  confidence: 'high' | 'low';
}

export interface ExtractionResult {
  documentKind: 'syllabus' | 'assignment' | 'schedule' | 'other';
  /** Short name for the document, e.g. "English Comp syllabus". */
  title: string;
  /** The class this belongs to. An exact entry from knownClasses when it matches one. */
  className: string | null;
  /** One or two plain sentences about what's in the document. */
  summary: string;
  dueItems: ExtractedItem[];
  classMeetings: ExtractedMeeting[];
  /** At most three things worth confirming, phrased as questions to the student. */
  questions: string[];
}

export type ExtractResponse = { ok: true; result: ExtractionResult } | { ok: false; error: string };
