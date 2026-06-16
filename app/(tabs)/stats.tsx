import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TextStyle } from 'react-native';
import { colors, space, font, radius } from '../../constants/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Card } from '../../components/ui';
import { useMatches, useTopScorers, useTeams } from '../../lib/hooks';
import { TEAMS } from '../../data/worldcup';
import { resolveTeam } from '../../lib/teamDisplay';

function StatTile({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, { color: tone }]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const { data: matches } = useMatches();
  const { data: scorers } = useTopScorers();
  const { data: teams } = useTeams();

  const stats = useMemo(() => {
    const finished = (matches ?? []).filter((m) => m.status === 'finished');
    const goals = finished.reduce((s, m) => s + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0);
    const live = (matches ?? []).filter((m) => m.status === 'live').length;
    const avg = finished.length ? goals / finished.length : 0;
    return { goals, played: finished.length, avg, live };
  }, [matches]);

  const powerRanking = useMemo(() => [...TEAMS].sort((a, b) => b.rating - a.rating).slice(0, 10), []);
  const maxRating = powerRanking[0]?.rating ?? 2100;
  const minRating = 1600;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Stats" subtitle="Tournament numbers & leaders" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.tiles}>
          <StatTile value={`${stats.goals}`} label="Goals scored" tone={colors.primary} />
          <StatTile value={`${stats.played}`} label="Matches played" tone={colors.text} />
          <StatTile value={stats.avg.toFixed(2)} label="Goals / match" tone={colors.accent} />
          <StatTile value={`${stats.live}`} label="Live now" tone={colors.live} />
        </View>

        <Text style={styles.sectionTitle}>👟 Golden Boot Race</Text>
        <Card padded={false}>
          {(scorers ?? []).length === 0 ? (
            <Text style={styles.emptyFeed}>Connect a scorer feed to show real Golden Boot leaders.</Text>
          ) : (
            (scorers ?? []).map((s, i) => {
              const team = resolveTeam(s.teamId, teams);
              return (
                <View key={s.playerId} style={[styles.scorerRow, i > 0 && styles.rowBorder]}>
                  <Text style={styles.scorerRank}>{i + 1}</Text>
                  <Text style={styles.scorerFlag}>{team.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.scorerName}>{s.name}</Text>
                    <Text style={styles.scorerTeam}>{team.name}</Text>
                  </View>
                  <View style={styles.scorerStats}>
                    <Text style={styles.scorerGoals}>{s.goals}</Text>
                    <Text style={styles.scorerGoalsLabel}>G</Text>
                    <Text style={styles.scorerAssists}>{s.assists}</Text>
                    <Text style={styles.scorerAssistsLabel}>A</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        <Text style={styles.sectionTitle}>📊 Power Rankings</Text>
        <Text style={styles.sectionSub}>Internal rating that drives the prediction model.</Text>
        <Card>
          {powerRanking.map((t, i) => {
            const widthPct = ((t.rating - minRating) / (maxRating - minRating)) * 100;
            return (
              <View key={t.id} style={styles.powerRow}>
                <Text style={styles.powerRank}>{i + 1}</Text>
                <Text style={styles.powerFlag}>{t.flag}</Text>
                <Text style={styles.powerName} numberOfLines={1}>{t.name}</Text>
                <View style={styles.powerTrack}>
                  <View style={[styles.powerFill, { width: `${Math.max(8, widthPct)}%` }]} />
                </View>
                <Text style={styles.powerVal}>{t.rating}</Text>
              </View>
            );
          })}
        </Card>
        <View style={{ height: space.xxxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  tileValue: { fontSize: font.size.xxxl, fontWeight: font.weight.heavy as TextStyle['fontWeight'], letterSpacing: 0 },
  tileLabel: { color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 },
  sectionTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold as TextStyle['fontWeight'], marginTop: space.xl, marginBottom: space.sm },
  sectionSub: { color: colors.textMuted, fontSize: font.size.sm, marginTop: -4, marginBottom: space.md },
  scorerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  scorerRank: { width: 18, color: colors.textFaint, fontSize: font.size.sm, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  scorerFlag: { fontSize: 22 },
  scorerName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  scorerTeam: { color: colors.textMuted, fontSize: font.size.xs },
  scorerStats: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  scorerGoals: { color: colors.primary, fontSize: font.size.lg, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  scorerGoalsLabel: { color: colors.textFaint, fontSize: font.size.xs, marginRight: 6 },
  scorerAssists: { color: colors.textMuted, fontSize: font.size.md, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  scorerAssistsLabel: { color: colors.textFaint, fontSize: font.size.xs },
  emptyFeed: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20, padding: space.lg },
  powerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 7 },
  powerRank: { width: 18, color: colors.textFaint, fontSize: font.size.sm, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  powerFlag: { fontSize: 18 },
  powerName: { width: 92, color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  powerTrack: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  powerFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  powerVal: { width: 38, textAlign: 'right', color: colors.textMuted, fontSize: font.size.sm, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
});
