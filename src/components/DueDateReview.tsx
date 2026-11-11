import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatDate, formatTime } from '../utils/format';
import { Button, COLORS } from './ui';

const TIME_OPTIONS: [number, number][] = [
  [9, 0],
  [12, 0],
  [17, 0],
  [23, 59],
];

interface Props {
  assignmentTitle: string;
  className?: string;
  dueAt: Date;
  onConfirm: () => void;
  onSave: (dueAt: Date) => void;
}

/**
 * Shown inside an assignment's row when its due date is an unconfirmed guess
 * read from a syllabus (DESIGN.md §1: surface the guess and ask, don't hide it).
 */
export default function DueDateReview({ assignmentTitle, className, dueAt, onConfirm, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(dueAt);

  const shiftDay = (days: number) =>
    setDraft((d) => {
      const next = new Date(d);
      next.setDate(d.getDate() + days);
      return next;
    });

  const setTime = ([hh, mm]: [number, number]) =>
    setDraft((d) => {
      const next = new Date(d);
      next.setHours(hh, mm, 0, 0);
      return next;
    });

  const source = className ? `your ${className} syllabus` : 'a syllabus';

  if (!editing) {
    return (
      <View style={styles.banner} accessibilityLabel={`Check the due date for ${assignmentTitle}`}>
        <Text style={styles.label}>Check this date</Text>
        <Text style={styles.text}>
          The due date for <Text style={styles.bold}>{assignmentTitle}</Text> came from {source} and might be off. Is{' '}
          <Text style={styles.bold}>
            {formatDate(dueAt)} at {formatTime(dueAt)}
          </Text>{' '}
          right?
        </Text>
        <View style={styles.row}>
          <Button label="Looks right" small onPress={onConfirm} />
          <Button
            label="Fix it"
            small
            onPress={() => {
              setDraft(dueAt);
              setEditing(true);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.label}>Fix the due date</Text>
      <Text style={styles.text}>
        When is <Text style={styles.bold}>{assignmentTitle}</Text> actually due?
      </Text>

      <View style={styles.dayRow}>
        <Button label="‹" small onPress={() => shiftDay(-1)} accessibilityHint="Previous day" />
        <Text style={styles.day}>{formatDate(draft)}</Text>
        <Button label="›" small onPress={() => shiftDay(1)} accessibilityHint="Next day" />
      </View>

      <View style={styles.row}>
        {TIME_OPTIONS.map(([hh, mm]) => {
          const option = new Date(draft);
          option.setHours(hh, mm, 0, 0);
          return (
            <Button
              key={`${hh}:${mm}`}
              label={formatTime(option)}
              small
              selected={draft.getHours() === hh && draft.getMinutes() === mm}
              onPress={() => setTime([hh, mm])}
            />
          );
        })}
      </View>

      <View style={styles.row}>
        <Button label="Save" primary small onPress={() => onSave(draft)} />
        <Button label="Cancel" small onPress={() => setEditing(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.reviewBg,
    borderColor: COLORS.reviewBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.reviewText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  text: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bold: { fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  day: { fontSize: 15, fontWeight: '600', color: COLORS.text, minWidth: 140, textAlign: 'center' },
});
