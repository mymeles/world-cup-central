import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { colors, font, radius, shadow, space } from '../constants/theme';

const mastheadArt = require('../assets/images/world-cup-central-masthead.png');
const mastheadMobileArt = require('../assets/images/world-cup-central-masthead-mobile.png');

export function CentralMasthead({ compact = false }: { compact?: boolean }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  return (
    <View style={[styles.wrap, compact && styles.compactWrap]}>
      <Image
        source={isWide ? mastheadArt : mastheadMobileArt}
        style={[styles.art, compact && styles.compactArt]}
        contentFit="cover"
        contentPosition="center"
        transition={120}
      />
      <View style={[styles.brand, compact && styles.compactBrand]}>
        <Text style={[styles.world, isWide && styles.worldWide, compact && styles.compactWorld]}>WORLD CUP</Text>
        <Text style={[styles.central, isWide && styles.centralWide, compact && styles.compactCentral]}>CENTRAL</Text>
        <Text style={[styles.tagline, compact && styles.compactTagline]}>One World. One Game.</Text>
      </View>
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>Live & Updated</Text>
        <View style={styles.divider} />
        <Text style={styles.freshText}>12s ago</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 250,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compactWrap: { height: 196 },
  art: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    height: 238,
  },
  compactArt: { height: 176 },
  brand: {
    position: 'absolute',
    left: 104,
    right: 34,
    top: 46,
    alignItems: 'center',
  },
  compactBrand: { top: 38 },
  world: {
    color: colors.ink,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: font.weight.heavy as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  central: {
    color: colors.blue,
    fontSize: 32,
    lineHeight: 33,
    fontStyle: 'italic',
    fontWeight: font.weight.heavy as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold as TextStyle['fontWeight'],
    marginTop: 6,
    textAlign: 'center',
  },
  compactWorld: { fontSize: 28, lineHeight: 30 },
  compactCentral: { fontSize: 28, lineHeight: 29 },
  compactTagline: { fontSize: font.size.sm, marginTop: 4 },
  worldWide: { fontSize: 54, lineHeight: 56 },
  centralWide: { fontSize: 55, lineHeight: 56 },
  liveBadge: {
    position: 'absolute',
    left: space.xl,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  liveDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.primary },
  liveText: {
    color: colors.primaryDim,
    fontSize: font.size.md,
    fontWeight: font.weight.bold as TextStyle['fontWeight'],
  },
  divider: { width: 1, height: 18, backgroundColor: colors.border },
  freshText: { color: colors.textMuted, fontSize: font.size.sm },
});
