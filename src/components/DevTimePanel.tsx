import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DEMO_MODE } from '../config/demo';
import { DEV_SCENARIOS, DevScenario } from '../mocks/scenarios';
import { Button, COLORS } from './ui';

interface Props {
  activeId: string | null;
  faked: boolean;
  onPick: (scenario: DevScenario | null) => void;
  onShift: (minutes: number) => void;
}

/** Dev-only controls for faking the clock. Only render this when __DEV__ is true. */
export default function DevTimePanel({ activeId, faked, onPick, onShift }: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{DEMO_MODE ? 'Demo: try a different time' : 'Dev: fake the time'}</Text>
      <Text style={styles.sub}>Each preset resets the mock week to its starting data.</Text>
      <View style={styles.row}>
        <Button label="Real time" small selected={!faked} onPress={() => onPick(null)} />
        {DEV_SCENARIOS.map((s) => (
          <Button
            key={s.id}
            label={s.label}
            small
            selected={activeId === s.id}
            accessibilityHint={s.expect}
            onPress={() => onPick(s)}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Button label="−1 day" small onPress={() => onShift(-24 * 60)} />
        <Button label="−1 hr" small onPress={() => onShift(-60)} />
        <Button label="−15 min" small onPress={() => onShift(-15)} />
        <Button label="+15 min" small onPress={() => onShift(15)} />
        <Button label="+1 hr" small onPress={() => onShift(60)} />
        <Button label="+1 day" small onPress={() => onShift(24 * 60)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 32,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.dev,
    backgroundColor: COLORS.devBg,
  },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.dev },
  sub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
