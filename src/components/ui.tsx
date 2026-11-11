import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export const COLORS = {
  bg: '#f7f9fc',
  card: '#ffffff',
  text: '#1a1a2e',
  muted: '#5f6474',
  border: '#dde3ef',
  accent: '#4a6cf7',
  accentSoft: '#eef1fe',
  reviewBg: '#fff8e6',
  reviewBorder: '#e8c873',
  reviewText: '#7a5a00',
  dev: '#7c3aed',
  devBg: '#f5f0ff',
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  primary?: boolean;
  selected?: boolean;
  small?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

export function Button({ label, onPress, primary, selected, small, disabled, accessibilityHint }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.button,
        small && styles.small,
        primary && styles.primary,
        selected && styles.selected,
        (pressed || disabled) && styles.dim,
      ]}
    >
      <Text style={[styles.text, small && styles.smallText, primary && styles.primaryText, selected && styles.selectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
  },
  small: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  primary: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  selected: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  dim: { opacity: 0.6 },
  text: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  smallText: { fontSize: 13 },
  primaryText: { color: '#fff' },
  selectedText: { color: COLORS.accent },
});
