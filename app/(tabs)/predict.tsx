import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TextStyle, InteractionManager } from 'react-native';
import { colors, space, font, radius } from '../../constants/theme';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Card, ProbBar, Pill } from '../../components/ui';
import { useMatches, useTeams } from '../../lib/hooks';
import { getTeam } from '../../data/worldcup';
import { resolveTeam } from '../../lib/teamDisplay';
import { predictMatch } from '../../lib/predict';
import { runTournamentSim, type TitleOdds } from '../../lib/simulate';
import { pct } from '../../lib/format';
import { kickoffTime } from '../../lib/format';

function OddsRow({ odds, rank }: { odds: TitleOdds; rank: number }) {
  const team = getTeam(odds.teamId);
  return (
    <View style={styles.oddsRow}>
      <Text style={styles.oddsRank}>{rank}</Text>
      <Text style={styles.oddsFlag}>{team.flag}</Text>
      <Text style={styles.oddsName} numberOfLines={1}>{team.name}</Text>
      <View style={styles.oddsBarTrack}>
        <View style={[styles.oddsBarFill, { width: `${Math.min(100, odds.champion * 100 * 3.2)}%` }]} />
      </View>
      <Text style={styles.oddsPct}>{(odds.champion * 100).toFixed(1)}%</Text>
    </View>
  );
}

function PredictionCard({ matchId }: { matchId: string }) {
  const { data: matches } = useMatches();
  const { data: teams } = useTeams();
  const match = matches?.find((m) => m.id === matchId);
  if (!match) return null;
  const home = resolveTeam(match.homeId, teams);
  const away = resolveTeam(match.awayId, teams);
  if (!home.knownTeam || !away.knownTeam) return null;
  const p = predictMatch(home.knownTeam, away.knownTeam);
  return (
    <Card style={{ marginBottom: space.sm }}>
      <View style={styles.predHead}>
        <Text style={styles.predMeta}>{match.group ? `Group ${match.group}` : 'Group Stage'} · {kickoffTime(match.kickoff)}</Text>
        <Pill label={`xG ${p.expHomeGoals.toFixed(1)}–${p.expAwayGoals.toFixed(1)}`} tone="violet" />
      </View>
      <View style={styles.predTeams}>
        <View style={styles.predTeam}>
          <Text style={styles.predFlag}>{home.flag}</Text>
          <Text style={styles.predName} numberOfLines={1}>{home.name}</Text>
        </View>
        <Text style={styles.predScore}>{p.likelyScore.home}–{p.likelyScore.away}</Text>
        <View style={[styles.predTeam, { justifyContent: 'flex-end' }]}>
          <Text style={[styles.predName, { textAlign: 'right' }]} numberOfLines={1}>{away.name}</Text>
          <Text style={styles.predFlag}>{away.flag}</Text>
        </View>
      </View>
      <ProbBar home={p.homeWin} draw={p.draw} away={p.awayWin} />
      <View style={styles.predPcts}>
        <Text style={[styles.predPct, { color: colors.primary }]}>{pct(p.homeWin)}</Text>
        <Text style={[styles.predPct, { color: colors.draw }]}>Draw {pct(p.draw)}</Text>
        <Text style={[styles.predPct, { color: colors.accent }]}>{pct(p.awayWin)}</Text>
      </View>
    </Card>
  );
}

export default function PredictScreen() {
  const { data: matches } = useMatches();
  const [odds, setOdds] = useState<TitleOdds[] | null>(null);

  useEffect(() => {
    // Defer the heavy simulation until after the screen has painted.
    const task = InteractionManager.runAfterInteractions(() => {
      setOdds(runTournamentSim(1000));
    });
    return () => task.cancel();
  }, []);

  const upcoming = useMemo(
    () => (matches ?? []).filter((m) => m.status === 'scheduled').slice(0, 6),
    [matches],
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Predictions" subtitle="Powered by a Poisson + Monte-Carlo model" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>🏆 Title Race</Text>
            <Pill label={odds ? '1,000 sims' : 'simulating…'} tone="accent" />
          </View>
          <Text style={styles.cardSub}>Championship probability from simulating the full bracket.</Text>
          {!odds ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: space.xl }} />
          ) : (
            <View style={{ marginTop: space.md, gap: 2 }}>
              {odds.slice(0, 10).map((o, i) => (
                <OddsRow key={o.teamId} odds={o} rank={i + 1} />
              ))}
            </View>
          )}
        </Card>

        <Text style={styles.sectionTitle}>Match Predictor</Text>
        <Text style={styles.sectionSub}>Win / draw / loss probability and most likely scoreline.</Text>
        {upcoming.map((m) => (
          <PredictionCard key={m.id} matchId={m.id} />
        ))}

        <Text style={styles.disclaimer}>
          Model is transparent: team power ratings → expected goals → independent Poisson scorelines, then 1,000 full-tournament simulations. Not betting advice.
        </Text>
        <View style={{ height: space.xxxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  cardSub: { color: colors.textMuted, fontSize: font.size.sm, marginTop: 4 },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 7 },
  oddsRank: { width: 18, color: colors.textFaint, fontSize: font.size.sm, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  oddsFlag: { fontSize: 18 },
  oddsName: { width: 92, color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  oddsBarTrack: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  oddsBarFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
  oddsPct: { width: 46, textAlign: 'right', color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  sectionTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold as TextStyle['fontWeight'], marginTop: space.xl, marginBottom: 2 },
  sectionSub: { color: colors.textMuted, fontSize: font.size.sm, marginBottom: space.md },
  predHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  predMeta: { color: colors.textFaint, fontSize: font.size.xs, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  predTeams: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
  predTeam: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  predFlag: { fontSize: 22 },
  predName: { flex: 1, color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  predScore: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy as TextStyle['fontWeight'], paddingHorizontal: space.md },
  predPcts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.sm },
  predPct: { fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  disclaimer: { color: colors.textFaint, fontSize: font.size.xs, lineHeight: 17, marginTop: space.xl, fontStyle: 'italic' },
});
