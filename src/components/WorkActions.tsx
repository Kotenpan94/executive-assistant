import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SMALL_PIECE_MINUTES } from '../state/weekActions';
import { Button, COLORS } from './ui';

interface Props {
  /** 'current' = inside its planned window; 'missed' = window passed with nothing recorded. */
  variant: 'current' | 'missed';
  onDone: () => void;
  onMove: () => void;
  onBreak: (pieceTitle: string) => void;
  onSkip: () => void;
}

/**
 * Actions for one Step or atomic Task. "Not now" never just dismisses: it
 * asks whether to move the item or break it smaller (DESIGN.md §9 tone rules).
 */
export default function WorkActions({ variant, onDone, onMove, onBreak, onSkip }: Props) {
  const [mode, setMode] = useState<'idle' | 'options' | 'break'>(variant === 'missed' ? 'options' : 'idle');
  const [piece, setPiece] = useState('');

  if (mode === 'break') {
    const canSave = piece.trim().length > 0;
    return (
      <View style={styles.box}>
        <Text style={styles.prompt}>What's a small first piece you could do in about {SMALL_PIECE_MINUTES} minutes?</Text>
        <TextInput
          style={styles.input}
          value={piece}
          onChangeText={setPiece}
          placeholder="e.g. Just read the first page"
          placeholderTextColor="#999"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => canSave && onBreak(piece)}
          accessibilityLabel="Small first piece"
        />
        <Text style={styles.hint}>That piece starts now. The rest moves to tomorrow at the same time.</Text>
        <View style={styles.row}>
          <Button label="Start this piece" primary disabled={!canSave} onPress={() => onBreak(piece)} />
          <Button label="Back" onPress={() => setMode('options')} />
        </View>
      </View>
    );
  }

  if (mode === 'options') {
    return (
      <View style={variant === 'current' ? styles.box : undefined}>
        {variant === 'current' && <Text style={styles.prompt}>Want to move it or break it smaller?</Text>}
        <View style={styles.row}>
          {variant === 'missed' && <Button label="Already did it" onPress={onDone} />}
          <Button label="Move to tomorrow" onPress={onMove} />
          <Button label="Break it smaller" onPress={() => setMode('break')} />
          {variant === 'current' && <Button label="Skip it this time" onPress={onSkip} />}
          {variant === 'current' && <Button label="Back" onPress={() => setMode('idle')} />}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Button label="Done" primary onPress={onDone} />
      <Button label="Not now" onPress={() => setMode('options')} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  box: { marginTop: 14, padding: 14, borderRadius: 12, backgroundColor: COLORS.bg },
  prompt: { fontSize: 15, fontWeight: '600', color: COLORS.text, lineHeight: 21 },
  hint: { fontSize: 13, color: COLORS.muted, marginTop: 8, lineHeight: 18 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.text,
    marginTop: 10,
  },
});
