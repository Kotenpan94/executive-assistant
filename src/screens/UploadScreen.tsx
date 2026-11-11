import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Button, COLORS } from '../components/ui';
import { DEMO_MODE } from '../config/demo';
import { readSampleSyllabus, SAMPLE_ASSET } from '../mocks/sampleExtraction';
import { extractDocument } from '../services/extract';
import { importExtraction, ImportSummary, isAlreadyPlanned, itemDueAt, matchClass } from '../state/importExtraction';
import { useWeek } from '../state/WeekContext';
import type { ExtractedItem, ExtractionResult, UploadKind } from '../types/extraction';
import { formatDate, formatTime } from '../utils/format';

const KINDS: { id: UploadKind; label: string }[] = [
  { id: 'syllabus', label: 'Syllabus' },
  { id: 'assignment', label: 'Take-home assignment' },
  { id: 'unsure', label: 'Not sure' },
];

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'image/*',
  'text/plain',
];

type Phase =
  | { name: 'pick' }
  | { name: 'reading' }
  | { name: 'review'; result: ExtractionResult }
  | { name: 'done'; summary: ImportSummary };

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadScreen() {
  const { week, setWeek } = useWeek();
  const [kind, setKind] = useState<UploadKind>('syllabus');
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: 'pick' });
  const [error, setError] = useState<string | null>(null);

  const pickFile = async () => {
    setError(null);
    if (DEMO_MODE) {
      setAsset(SAMPLE_ASSET);
      return;
    }
    const res = await DocumentPicker.getDocumentAsync({ type: ACCEPTED_TYPES, copyToCacheDirectory: true });
    if (!res.canceled && res.assets[0]) setAsset(res.assets[0]);
  };

  const read = async () => {
    if (!asset) return;
    setError(null);
    setPhase({ name: 'reading' });
    try {
      const result = DEMO_MODE
        ? await readSampleSyllabus(new Date())
        : await extractDocument(asset, kind, week.classes.map((c) => c.name), new Date());
      setPhase({ name: 'review', result });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again in a moment.');
      setPhase({ name: 'pick' });
    }
  };

  const startOver = () => {
    setAsset(null);
    setError(null);
    setPhase({ name: 'pick' });
  };

  // Review has its own scroll area so the Add button can stay pinned at the bottom.
  if (phase.name === 'review' && asset) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Review
          result={phase.result}
          onCancel={startOver}
          onAdd={(choices) => {
            const now = new Date();
            const { week: next, summary } = importExtraction(week, phase.result, choices, { fileName: asset.name, uri: asset.uri, kind }, now);
            setWeek(next);
            setPhase({ name: 'done', summary });
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {phase.name === 'pick' && (
          <>
            <Text style={styles.title}>Add a document</Text>
            <Text style={styles.body}>
              Upload a syllabus or a take-home assignment. You'll see what was found and choose what goes on your plan.
            </Text>

            <Text style={styles.label}>What is it?</Text>
            <View style={styles.row}>
              {KINDS.map((k) => (
                <Button key={k.id} label={k.label} small selected={kind === k.id} onPress={() => setKind(k.id)} />
              ))}
            </View>

            {asset ? (
              <View style={styles.fileCard}>
                <Text style={styles.fileName} numberOfLines={2}>
                  {asset.name}
                </Text>
                <Text style={styles.muted}>{formatSize(asset.size)}</Text>
                <View style={styles.row}>
                  <Button label="Read it" primary onPress={read} />
                  {!DEMO_MODE && <Button label="Choose a different file" onPress={pickFile} />}
                </View>
              </View>
            ) : (
              <View style={styles.row}>
                <Button label={DEMO_MODE ? 'Use a sample syllabus' : 'Choose a file'} primary onPress={pickFile} />
              </View>
            )}
            {DEMO_MODE ? (
              <Text style={styles.hint}>
                This is a demo. It uses a sample syllabus and a saved result instead of sending a file to Claude. The
                full app reads PDFs, Word files, photos and text files.
              </Text>
            ) : (
              <Text style={styles.hint}>PDF, Word file, photo, or text file.</Text>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            {!DEMO_MODE && (
              <Text style={styles.privacy}>
                To read it, the file is sent to Claude, Anthropic's AI. This app doesn't upload it anywhere else.
              </Text>
            )}
          </>
        )}

        {phase.name === 'reading' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.readingTitle}>Reading {asset?.name}</Text>
            <Text style={styles.muted}>This can take up to a minute.</Text>
          </View>
        )}

        {phase.name === 'done' && <Done summary={phase.summary} onAgain={startOver} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Review ────────────────────────────────────────────────────────────────

function Review({
  result,
  onAdd,
  onCancel,
}: {
  result: ExtractionResult;
  onAdd: (choices: { items: number[]; meetings: number[]; includeSteps: boolean }) => void;
  onCancel: () => void;
}) {
  const { week } = useWeek();
  const now = useMemo(() => new Date(), []);
  const matched = matchClass(week, result.className);

  // Why an item can't or shouldn't be added by default.
  const itemStatus = (item: ExtractedItem): 'ok' | 'no-date' | 'past' | 'duplicate' => {
    const due = itemDueAt(item);
    if (!due) return 'no-date';
    if (due < now) return 'past';
    if (isAlreadyPlanned(week, item, matched?.id)) return 'duplicate';
    return 'ok';
  };

  const [items, setItems] = useState<Set<number>>(
    () => new Set(result.dueItems.flatMap((item, i) => (itemStatus(item) === 'ok' ? [i] : []))),
  );
  // Default class times on only for a new class: a known class probably has them already.
  const [meetings, setMeetings] = useState<Set<number>>(
    () => new Set(matched ? [] : result.classMeetings.flatMap((m, i) => (m.confidence === 'high' ? [i] : []))),
  );
  const [includeSteps, setIncludeSteps] = useState(true);

  const toggle = (set: Set<number>, i: number) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  };

  const [openSteps, setOpenSteps] = useState<Set<number>>(() => new Set());
  const [showPast, setShowPast] = useState(false);

  const statuses = result.dueItems.map(itemStatus);
  const indexes = result.dueItems.map((_, i) => i);
  const current = indexes.filter((i) => statuses[i] !== 'past');
  const past = indexes.filter((i) => statuses[i] === 'past');
  // "Select all" picks everything that belongs on the plan: dated, upcoming, not already there.
  const selectable = indexes.filter((i) => statuses[i] === 'ok');
  const allSelected = selectable.length > 0 && selectable.every((i) => items.has(i));
  const skippedByAll = current.length - selectable.length;

  const count = items.size + meetings.size;
  const hasSteps = result.dueItems.some((item, i) => items.has(i) && item.suggestedSteps.length > 0);

  const renderItem = (i: number) => {
    const item = result.dueItems[i];
    const status = statuses[i];
    const due = itemDueAt(item);
    const stepCount = item.suggestedSteps.length;
    const stepsOpen = openSteps.has(i);
    return (
      <View key={i} style={styles.itemCard}>
        <CheckRow
          checked={items.has(i)}
          disabled={status === 'no-date'}
          onToggle={() => setItems((s) => toggle(s, i))}
          title={item.title}
          meta={due ? `Due ${formatDate(due)}${item.dueTime ? ` at ${formatTime(due)}` : ''}` : 'No date in the document'}
        />
        {status === 'no-date' && <Text style={styles.itemNote}>This one can't go on the plan until it has a date.</Text>}
        {status === 'duplicate' && <Text style={styles.itemNote}>Looks like this is already on your plan.</Text>}
        {item.confidence === 'low' && (
          <View style={styles.unsure}>
            <Text style={styles.unsureLabel}>Not sure about this one</Text>
            {item.confidenceNote && <Text style={styles.unsureText}>{item.confidenceNote}</Text>}
            <Text style={styles.quote}>From the document: “{item.sourceText}”</Text>
            <Text style={styles.unsureText}>If you add it, the Now tab will ask you to check the date.</Text>
          </View>
        )}
        {includeSteps && items.has(i) && stepCount > 0 && (
          <View style={styles.steps}>
            <Pressable onPress={() => setOpenSteps((s) => toggle(s, i))} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.link}>
                {stepCount} suggested step{stepCount === 1 ? '' : 's'} · {stepsOpen ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
            {stepsOpen &&
              item.suggestedSteps.map((st, j) => (
                <Text key={j} style={styles.stepText}>
                  • {st.title} · {st.minutes} min ·{' '}
                  {st.daysBeforeDue === 0 ? 'day it’s due' : `${st.daysBeforeDue} day${st.daysBeforeDue === 1 ? '' : 's'} before`}
                </Text>
              ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{result.title}</Text>
        <Text style={styles.body}>{result.summary}</Text>
        {result.className && (
          <Text style={styles.muted}>For: {matched ? matched.name : `${result.className} (new class)`}</Text>
        )}

        {result.questions.length > 0 && (
          <View style={styles.questions}>
            <Text style={styles.questionsTitle}>A few things to check</Text>
            {result.questions.map((q, i) => (
              <Text key={i} style={styles.questionText}>
                • {q}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Due dates found</Text>
        {result.dueItems.length === 0 && <Text style={styles.muted}>No due dates in this document.</Text>}

        {selectable.length > 0 && (
          <View style={styles.toolbar}>
            <Text style={styles.toolbarText}>
              {current.filter((i) => items.has(i)).length} of {current.length} selected
            </Text>
            <Button
              small
              label={allSelected ? 'Clear all' : `Select all (${selectable.length})`}
              onPress={() => setItems(allSelected ? new Set() : new Set([...items, ...selectable]))}
            />
          </View>
        )}
        {selectable.length > 0 && skippedByAll > 0 && (
          <Text style={styles.hint}>Select all skips ones with no date or already on your plan.</Text>
        )}
        {current.length === 0 && past.length > 0 && (
          <Text style={styles.body}>Every date in this document has already passed. It might be from an earlier term.</Text>
        )}

        {current.map(renderItem)}

        {past.length > 0 && (
          <>
            <Pressable onPress={() => setShowPast((v) => !v)} accessibilityRole="button" style={styles.pastToggle}>
              <Text style={styles.link}>
                {past.length} with dates that already passed · {showPast ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
            {showPast && (
              <View style={styles.toolbar}>
                <Text style={styles.toolbarText}>These won't show up on Now, since their dates are over.</Text>
                <Button
                  small
                  label={past.every((i) => items.has(i)) ? 'Clear these' : `Select these (${past.length})`}
                  onPress={() =>
                    setItems((s) => {
                      const next = new Set(s);
                      const all = past.every((i) => s.has(i));
                      past.forEach((i) => (all ? next.delete(i) : next.add(i)));
                      return next;
                    })
                  }
                />
              </View>
            )}
            {showPast && past.map(renderItem)}
          </>
        )}

        {result.classMeetings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Class times found</Text>
            {matched && <Text style={styles.muted}>You already have {matched.name}, so these start unchecked.</Text>}
            {result.classMeetings.map((m, i) => (
              <View key={i} style={styles.itemCard}>
                <CheckRow
                  checked={meetings.has(i)}
                  onToggle={() => setMeetings((s) => toggle(s, i))}
                  title={m.title}
                  meta={`${m.days.map((d) => d[0].toUpperCase() + d.slice(1)).join(', ')} · ${m.startTime}–${m.endTime}${m.placeLabel ? ` · ${m.placeLabel}` : ''}`}
                />
                {m.confidence === 'low' && <Text style={styles.itemNote}>Not sure about this time. Worth a quick check.</Text>}
              </View>
            ))}
          </>
        )}

        {hasSteps && (
          <View style={styles.stepsToggle}>
            <CheckRow
              checked={includeSteps}
              onToggle={() => setIncludeSteps((v) => !v)}
              title="Also plan the suggested steps"
              meta="Each step goes into free time between 3 and 9 PM before its due date."
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={count === 0 ? 'Nothing selected' : `Add ${count} to my plan`}
          primary
          disabled={count === 0}
          onPress={() => onAdd({ items: [...items].sort((a, b) => a - b), meetings: [...meetings].sort((a, b) => a - b), includeSteps })}
        />
        <Button label="Start over" onPress={onCancel} />
      </View>
    </>
  );
}

function CheckRow({
  checked,
  disabled,
  onToggle,
  title,
  meta,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  title: string;
  meta: string;
}) {
  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={[styles.checkRow, disabled && styles.dim]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>{checked && <Text style={styles.tick}>✓</Text>}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.muted}>{meta}</Text>
      </View>
    </Pressable>
  );
}

// ── Done ──────────────────────────────────────────────────────────────────

function Done({ summary, onAgain }: { summary: ImportSummary; onAgain: () => void }) {
  const parts = [
    summary.assignments && `${summary.assignments} due date${summary.assignments === 1 ? '' : 's'}`,
    summary.steps && `${summary.steps} step${summary.steps === 1 ? '' : 's'}`,
    summary.meetings && `${summary.meetings} class time${summary.meetings === 1 ? '' : 's'}`,
  ].filter(Boolean);

  return (
    <>
      <Text style={styles.title}>Added to your plan</Text>
      <Text style={styles.body}>{parts.length ? `${parts.join(', ')}.` : 'Nothing new was added.'}</Text>
      {summary.newClassName && <Text style={styles.body}>{summary.newClassName} was added as a new class.</Text>}
      {summary.unplacedSteps > 0 && (
        <Text style={styles.body}>
          {summary.unplacedSteps} step{summary.unplacedSteps === 1 ? '' : 's'} didn't fit into free time before the due date, so{' '}
          {summary.unplacedSteps === 1 ? 'it wasn’t' : 'they weren’t'} added. You can fit them in when you plan the week.
        </Text>
      )}
      <Text style={styles.muted}>They'll show up on the Now tab when it's time.</Text>
      <View style={styles.row}>
        <Button label="Add another document" primary onPress={onAgain} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  body: { fontSize: 16, color: COLORS.text, lineHeight: 22, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  muted: { fontSize: 14, color: COLORS.muted, marginTop: 2, lineHeight: 19 },
  hint: { fontSize: 13, color: COLORS.muted, marginTop: 8 },
  error: { fontSize: 14, color: '#b42318', marginTop: 14, lineHeight: 20 },
  privacy: { fontSize: 13, color: COLORS.muted, marginTop: 28, lineHeight: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  dim: { opacity: 0.55 },

  fileCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  fileName: { fontSize: 16, fontWeight: '600', color: COLORS.text },

  center: { alignItems: 'center', paddingTop: 80, gap: 10 },
  readingTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, textAlign: 'center', marginTop: 8 },

  questions: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.reviewBg,
    borderWidth: 1,
    borderColor: COLORS.reviewBorder,
  },
  questionsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.reviewText, marginBottom: 6 },
  questionText: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginTop: 2 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 24, marginBottom: 6 },
  itemCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tick: { color: '#fff', fontSize: 15, fontWeight: '700' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  itemNote: { fontSize: 13, color: COLORS.muted, marginTop: 8, marginLeft: 36 },

  unsure: {
    marginTop: 10,
    marginLeft: 36,
    padding: 10,
    borderRadius: 8,
    backgroundColor: COLORS.reviewBg,
    borderWidth: 1,
    borderColor: COLORS.reviewBorder,
    gap: 4,
  },
  unsureLabel: { fontSize: 12, fontWeight: '700', color: COLORS.reviewText, textTransform: 'uppercase', letterSpacing: 0.5 },
  unsureText: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  quote: { fontSize: 13, color: COLORS.muted, fontStyle: 'italic', lineHeight: 18 },

  steps: { marginTop: 10, marginLeft: 36 },
  link: { fontSize: 14, fontWeight: '600', color: COLORS.accent, marginBottom: 2 },
  stepText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 },
  toolbarText: { flex: 1, fontSize: 14, color: COLORS.muted, marginRight: 10 },
  pastToggle: { marginTop: 16, paddingVertical: 6 },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },

  stepsToggle: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
  },
});
