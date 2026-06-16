import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { colors, radius, space, font, shadow } from '../constants/theme';

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  const inner = (
    <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }]}>
      {inner}
    </Pressable>
  );
}

export function Pill({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'live' | 'primary' | 'accent' | 'violet';
  icon?: React.ReactNode;
}) {
  const toneStyle = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
    live: { bg: colors.liveSoft, fg: colors.live },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    accent: { bg: colors.accentSoft, fg: colors.accent },
    violet: { bg: colors.violetSoft, fg: colors.violet },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: toneStyle.bg }]}>
      {icon}
      <Text style={[styles.pillText, { color: toneStyle.fg }]}>{label}</Text>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Tag({ text }: { text: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

/** A three-segment probability bar (home / draw / away). */
export function ProbBar({ home, draw, away }: { home: number; draw: number; away: number }) {
  return (
    <View style={styles.probBar}>
      <View style={{ flex: home, backgroundColor: colors.primary }} />
      <View style={{ flex: draw, backgroundColor: colors.draw }} />
      <View style={{ flex: away, backgroundColor: colors.accent }} />
    </View>
  );
}

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardPadded: { padding: space.lg },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillText: { fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'], letterSpacing: 0 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
    marginTop: space.lg,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  tag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  probBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  h1: {
    color: colors.text,
    fontSize: font.size.xxxl,
    fontWeight: font.weight.heavy as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  muted: { color: colors.textMuted, fontSize: font.size.sm },
});
