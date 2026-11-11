// A pre-recorded extraction result for the public demo, shaped like a real
// answer from the extraction server. Dates are relative to "now" so the demo
// never goes stale. It shows each case the review screen handles: confident
// items with steps, a guessed date, a missing date, a far-off item, and a
// date that already passed.

import type { DocumentPickerAsset } from 'expo-document-picker';
import type { ExtractionResult } from '../types/extraction';

export const SAMPLE_ASSET: DocumentPickerAsset = {
  name: 'PSYC 101 syllabus (sample).pdf',
  uri: 'demo:sample-syllabus',
  size: 184_320,
  mimeType: 'application/pdf',
  lastModified: 0,
};

function ymd(base: Date, addDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function sampleExtraction(now: Date): ExtractionResult {
  return {
    documentKind: 'syllabus',
    title: 'Intro to Psychology syllabus',
    className: 'Intro to Psychology',
    summary:
      'Course schedule for PSYC 101 with weekly readings, two quizzes, a midterm and a final paper. Lectures are Tuesday and Thursday afternoons.',
    dueItems: [
      {
        title: 'Syllabus quiz',
        kind: 'quiz',
        dueDate: ymd(now, -3),
        dueTime: '23:59',
        stakes: 'low',
        confidence: 'high',
        confidenceNote: null,
        sourceText: 'Complete the syllabus quiz on Canvas by the end of week 1.',
        suggestedSteps: [],
      },
      {
        title: 'Reading response 1',
        kind: 'assignment',
        dueDate: ymd(now, 4),
        dueTime: '23:59',
        stakes: 'medium',
        confidence: 'high',
        confidenceNote: null,
        sourceText: 'Reading response 1 (Ch. 2): 1 page, due on Canvas.',
        suggestedSteps: [
          { title: 'Read chapter 2', minutes: 45, daysBeforeDue: 3 },
          { title: 'Jot down three ideas to respond to', minutes: 20, daysBeforeDue: 2 },
          { title: 'Write and submit the response', minutes: 40, daysBeforeDue: 1 },
        ],
      },
      {
        title: 'Quiz 1: Research methods',
        kind: 'quiz',
        dueDate: ymd(now, 9),
        dueTime: '13:00',
        stakes: 'medium',
        confidence: 'high',
        confidenceNote: null,
        sourceText: 'Quiz 1 covers chapters 1–3, in class.',
        suggestedSteps: [
          { title: 'Make flashcards for key terms in ch. 1–3', minutes: 30, daysBeforeDue: 4 },
          { title: 'Do the end-of-chapter practice questions', minutes: 30, daysBeforeDue: 2 },
          { title: 'Quick review of flashcards', minutes: 15, daysBeforeDue: 1 },
        ],
      },
      {
        title: 'Midterm exam',
        kind: 'exam',
        dueDate: ymd(now, 18),
        dueTime: '13:00',
        stakes: 'high',
        confidence: 'low',
        confidenceNote:
          "The syllabus says the midterm is in \"Week 6\" but doesn't give a date. This is a guess, counting from the term start date.",
        sourceText: 'Week 6: Midterm exam (in class)',
        suggestedSteps: [
          { title: 'List the topics from weeks 1–5', minutes: 20, daysBeforeDue: 8 },
          { title: 'Make a one-page study guide', minutes: 50, daysBeforeDue: 6 },
          { title: 'Take a practice test', minutes: 50, daysBeforeDue: 4 },
          { title: 'Review what you missed on the practice test', minutes: 40, daysBeforeDue: 2 },
        ],
      },
      {
        title: 'Final paper',
        kind: 'project',
        dueDate: ymd(now, 45),
        dueTime: '23:59',
        stakes: 'high',
        confidence: 'high',
        confidenceNote: null,
        sourceText: 'Final paper (5–7 pages) due the last day of classes.',
        suggestedSteps: [],
      },
      {
        title: 'Participation reflection',
        kind: 'other',
        dueDate: null,
        dueTime: null,
        stakes: 'low',
        confidence: 'low',
        confidenceNote: "The syllabus mentions a participation reflection but doesn't say when it's due.",
        sourceText: 'Participation (10%) includes a short end-of-term reflection.',
        suggestedSteps: [],
      },
    ],
    classMeetings: [
      {
        title: 'Intro to Psychology lecture',
        days: ['tue', 'thu'],
        startTime: '13:00',
        endTime: '14:15',
        placeLabel: 'Hall B 120',
        confidence: 'high',
      },
      {
        title: 'Intro to Psychology discussion section',
        days: ['fri'],
        startTime: '10:00',
        endTime: '10:50',
        placeLabel: null,
        confidence: 'low',
      },
    ],
    questions: [
      'Is "Week 6" the week your midterm is actually in? The date here is a guess.',
      'Does the discussion section meet every Friday, or only some weeks?',
    ],
  };
}

/** The sample result, after a short pause so the "reading" state is visible. */
export function readSampleSyllabus(now: Date): Promise<ExtractionResult> {
  return new Promise((resolve) => setTimeout(() => resolve(sampleExtraction(now)), 1800));
}
