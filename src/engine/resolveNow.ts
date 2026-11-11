// "Now" resolution (DESIGN.md §5–6, Engine 1): given a timestamp and a
// student's week, decide the one thing the Now screen leads with.
//
// Priority:
//   1. Inside a fixed commitment → show only that. Never surface competing work (§9).
//   2. Inside a planned work block → that Step / atomic Task.
//   3. Earlier work from today with nothing recorded → one bundled "still open" card.
//   4. Otherwise free time, with a pointer to what's next.

import type { Assignment, Commitment, Step, StudentWeek, Task } from '../types';

export type AgendaItem =
  | { kind: 'commitment'; id: string; title: string; start: Date; end: Date; commitment: Commitment }
  | { kind: 'step'; id: string; title: string; start: Date; end: Date; step: Step; context?: string }
  | { kind: 'task'; id: string; title: string; start: Date; end: Date; task: Task };

export type WorkItem = Extract<AgendaItem, { kind: 'step' | 'task' }>;

export type Hero =
  | { kind: 'commitment'; item: Extract<AgendaItem, { kind: 'commitment' }> }
  | { kind: 'work'; item: WorkItem }
  | { kind: 'open'; items: WorkItem[] }
  | { kind: 'free'; next?: AgendaItem };

export interface NowView {
  hero: Hero;
  laterToday: AgendaItem[];
  dueSoon: (Assignment & { className?: string })[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** All of the week's items in time order. Done/skipped work is left out. */
export function buildAgenda(week: StudentWeek): AgendaItem[] {
  const className = (id?: string) => week.classes.find((c) => c.id === id)?.name;
  const assignmentById = new Map(week.assignments.map((a) => [a.id, a]));
  const tasksWithSteps = new Set(week.steps.filter((s) => s.parentType === 'task').map((s) => s.parentId));

  const items: AgendaItem[] = [];

  for (const c of week.commitments) {
    items.push({ kind: 'commitment', id: c.id, title: c.title, start: new Date(c.startsAt), end: new Date(c.endsAt), commitment: c });
  }

  for (const s of week.steps) {
    if (s.status !== 'planned') continue;
    const parent = s.parentType === 'assignment' ? assignmentById.get(s.parentId) : undefined;
    if (parent?.status === 'done') continue;
    items.push({
      kind: 'step',
      id: s.id,
      title: s.title,
      start: new Date(s.plannedStart),
      end: new Date(s.plannedEnd),
      step: s,
      context: parent ? [className(parent.classId), parent.title].filter(Boolean).join(' · ') : undefined,
    });
  }

  // Atomic tasks: open, scheduled, and not broken into Steps.
  for (const task of week.tasks) {
    if (task.status !== 'open' || !task.plannedStart || !task.plannedEnd || tasksWithSteps.has(task.id)) continue;
    items.push({ kind: 'task', id: task.id, title: task.title, start: new Date(task.plannedStart), end: new Date(task.plannedEnd), task });
  }

  return items.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function resolveNow(week: StudentWeek, now: Date): NowView {
  const agenda = buildAgenda(week);
  const isWork = (i: AgendaItem): i is WorkItem => i.kind !== 'commitment';
  const covers = (i: AgendaItem) => i.start <= now && now < i.end;

  const commitment = agenda.find((i): i is Extract<AgendaItem, { kind: 'commitment' }> => i.kind === 'commitment' && covers(i));
  const currentWork = agenda.find((i): i is WorkItem => isWork(i) && covers(i));
  const stillOpen = agenda.filter((i): i is WorkItem => isWork(i) && isSameDay(i.start, now) && i.end <= now);

  let hero: Hero;
  if (commitment) hero = { kind: 'commitment', item: commitment };
  else if (currentWork) hero = { kind: 'work', item: currentWork };
  else if (stillOpen.length > 0) hero = { kind: 'open', items: stillOpen };
  else hero = { kind: 'free', next: agenda.find((i) => i.start > now) };

  const heroIds = new Set(hero.kind === 'commitment' || hero.kind === 'work' ? [hero.item.id] : []);
  const laterToday = agenda.filter((i) => i.start > now && isSameDay(i.start, now) && !heroIds.has(i.id));

  const className = (id: string) => week.classes.find((c) => c.id === id)?.name;
  const dueSoon = week.assignments
    .filter((a) => a.status === 'open')
    .filter((a) => {
      const due = new Date(a.dueAt).getTime();
      return due > now.getTime() && due - now.getTime() <= 7 * DAY_MS;
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map((a) => ({ ...a, className: className(a.classId) }));

  return { hero, laterToday, dueSoon };
}
