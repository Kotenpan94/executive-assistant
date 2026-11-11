import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DevTimePanel from '../components/DevTimePanel';
import DueDateReview from '../components/DueDateReview';
import { COLORS } from '../components/ui';
import { DEMO_MODE, SHOW_TIME_CONTROLS } from '../config/demo';
import WorkActions from '../components/WorkActions';
import { AgendaItem, isSameDay, resolveNow, WorkItem } from '../engine/resolveNow';
import type { DevScenario } from '../mocks/scenarios';
import { buildMockWeek } from '../mocks/week';
import { useWeek } from '../state/WeekContext';
import { breakSmaller, confirmDueDate, markDone, moveToTomorrow, setDueDate, skip } from '../state/weekActions';
import type { StudentWeek } from '../types';
import { formatDate, formatDay, formatRange, formatTime } from '../utils/format';

function useRealClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function NowScreen() {
  const realNow = useRealClock();
  // Dev-only clock override. Always null in production builds.
  const [fakeNow, setFakeNow] = useState<Date | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const now = fakeNow ?? realNow;

  const { week, setWeek } = useWeek();
  const [note, setNote] = useState<string | null>(null);
  const view = useMemo(() => resolveNow(week, now), [week, now]);
  const { hero } = view;

  const update = (fn: (w: StudentWeek) => StudentWeek, message: string) => {
    setWeek(fn);
    setNote(message);
  };

  const actionsFor = (item: WorkItem) => ({
    onDone: () => update((w) => markDone(w, item, now), 'Marked done.'),
    onMove: () => update((w) => moveToTomorrow(w, item), 'Moved to tomorrow, same time.'),
    onBreak: (piece: string) =>
      update((w) => breakSmaller(w, item, piece, now), 'Smaller piece is up now. The rest is tomorrow.'),
    onSkip: () => update((w) => skip(w, item), 'Okay, skipped this time.'),
  });

  const pickScenario = (s: DevScenario | null) => {
    const fresh = buildMockWeek(realNow);
    setWeek(s?.prepare ? s.prepare(fresh) : fresh);
    setFakeNow(s ? s.now(realNow) : null);
    setScenarioId(s?.id ?? null);
    setNote(null);
  };

  const shiftClock = (minutes: number) => {
    setFakeNow((prev) => new Date((prev ?? realNow).getTime() + minutes * 60_000));
    setScenarioId(null);
  };

  const nothingElseToday = hero.kind === 'free' && (!hero.next || !isSameDay(hero.next.start, now));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {DEMO_MODE && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoText}>
              Demo with a sample student's week. Scroll down to jump to different times of day, or try the Add tab.
            </Text>
          </View>
        )}
        <Text style={styles.date}>{formatDate(now)}</Text>
        <View style={styles.clockRow}>
          <Text style={styles.clock}>{formatTime(now)}</Text>
          {fakeNow && <Text style={styles.devBadge}>{DEMO_MODE ? 'Demo · pretend time' : 'DEV · fake time'}</Text>}
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          {hero.kind === 'commitment' && (
            <>
              <Text style={styles.heroLabel}>Right now</Text>
              <Text style={styles.heroTitle}>{hero.item.title}</Text>
              <Text style={styles.heroMeta}>
                Until {formatTime(hero.item.end)}
                {hero.item.commitment.placeLabel ? ` · ${hero.item.commitment.placeLabel}` : ''}
              </Text>
              <Text style={styles.heroBody}>Nothing else needs you until then.</Text>
            </>
          )}

          {hero.kind === 'work' && (
            <>
              <Text style={styles.heroLabel}>Ready to start?</Text>
              <Text style={styles.heroTitle}>{hero.item.title}</Text>
              <Text style={styles.heroMeta}>
                {hero.item.kind === 'step' && hero.item.context ? `${hero.item.context}\n` : ''}
                {formatRange(hero.item.start, hero.item.end)}
              </Text>
              <WorkActions key={hero.item.id} variant="current" {...actionsFor(hero.item)} />
            </>
          )}

          {hero.kind === 'open' && (
            <>
              <Text style={styles.heroLabel}>Still open from earlier</Text>
              <Text style={styles.heroBody}>
                {hero.items.length === 1
                  ? "Looks like this didn't happen. Want to move it or break it smaller?"
                  : "Looks like these didn't happen. Want to move them or break them smaller?"}
              </Text>
              {hero.items.map((item) => (
                <View key={item.id} style={styles.openItem}>
                  <Text style={styles.openTitle}>{item.title}</Text>
                  <Text style={styles.itemMeta}>
                    {item.kind === 'step' && item.context ? `${item.context} · ` : ''}
                    Was {formatRange(item.start, item.end)}
                  </Text>
                  <WorkActions variant="missed" {...actionsFor(item)} />
                </View>
              ))}
            </>
          )}

          {hero.kind === 'free' && (
            <>
              <Text style={styles.heroLabel}>Right now</Text>
              <Text style={styles.heroTitle}>{nothingElseToday ? 'Nothing else today.' : 'Nothing planned right now.'}</Text>
              <Text style={styles.heroBody}>
                {hero.next
                  ? `Next up: ${hero.next.title}, ${formatDay(hero.next.start, now)} at ${formatTime(hero.next.start)}.`
                  : 'Nothing else is on the calendar this week.'}
              </Text>
            </>
          )}
        </View>

        {note && <Text style={styles.note}>{note}</Text>}

        {/* Later today. Hidden when the hero already says there's nothing else today. */}
        {!nothingElseToday && (
          <>
            <Text style={styles.sectionTitle}>Later today</Text>
            {view.laterToday.length === 0 ? (
              <Text style={styles.empty}>Nothing else today.</Text>
            ) : (
              view.laterToday.map((item) => <AgendaRow key={item.id} item={item} />)
            )}
          </>
        )}

        {/* Due soon */}
        <Text style={styles.sectionTitle}>Due in the next 7 days</Text>
        {view.dueSoon.length === 0 ? (
          <Text style={styles.empty}>Nothing due.</Text>
        ) : (
          view.dueSoon.map((a) => {
            const due = new Date(a.dueAt);
            const needsReview = a.extraction === 'needs-review';
            return (
              <View key={a.id} style={[styles.listRow, needsReview && styles.reviewRow]}>
                <Text style={styles.itemTitle}>{a.title}</Text>
                <Text style={styles.itemMeta}>
                  {a.className} · Due {formatDay(due, now)} at {formatTime(due)}
                </Text>
                {needsReview && (
                  <DueDateReview
                    assignmentTitle={a.title}
                    className={a.className}
                    dueAt={due}
                    onConfirm={() => update((w) => confirmDueDate(w, a.id), `Got it. ${a.title} stays as is.`)}
                    onSave={(d) =>
                      update(
                        (w) => setDueDate(w, a.id, d),
                        `Saved. ${a.title} is now due ${formatDate(d)} at ${formatTime(d)}.`,
                      )
                    }
                  />
                )}
              </View>
            );
          })
        )}

        {SHOW_TIME_CONTROLS && (
          <DevTimePanel activeId={scenarioId} faked={fakeNow !== null} onPick={pickScenario} onShift={shiftClock} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AgendaRow({ item }: { item: AgendaItem }) {
  return (
    <View style={styles.listRow}>
      <Text style={styles.itemTime}>{formatRange(item.start, item.end)}</Text>
      <Text style={styles.itemTitle}>{item.title}</Text>
      {item.kind === 'step' && item.context && <Text style={styles.itemMeta}>{item.context}</Text>}
      {item.kind === 'commitment' && item.commitment.placeLabel && (
        <Text style={styles.itemMeta}>{item.commitment.placeLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  demoBanner: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: COLORS.accentSoft,
    marginBottom: 16,
  },
  demoText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  date: { fontSize: 15, color: COLORS.muted },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  clock: { fontSize: 32, fontWeight: '700', color: COLORS.text },
  devBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dev,
    backgroundColor: COLORS.devBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },

  hero: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  heroTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  heroMeta: { fontSize: 15, color: COLORS.muted, lineHeight: 21 },
  heroBody: { fontSize: 16, color: COLORS.text, marginTop: 10, lineHeight: 22 },

  openItem: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 14, paddingTop: 14 },
  openTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },

  note: { fontSize: 14, color: COLORS.muted, marginTop: 12 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 28, marginBottom: 8 },
  empty: { fontSize: 15, color: COLORS.muted },
  listRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reviewRow: {
    // Card the essay row and its banner together so the banner clearly belongs to it.
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.reviewBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginVertical: 8,
  },
  itemTime: { fontSize: 13, color: COLORS.muted, marginBottom: 2 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  itemMeta: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
});
