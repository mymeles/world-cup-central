import React from 'react';
import { View, Text, StyleSheet, Pressable, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, space, font } from '../constants/theme';
import type { Match } from '../types';
import { kickoffTime } from '../lib/format';
import { getMatchDisplayState, hasVerifiedScore } from '../lib/matchStatus';
import { getMatchTeam, type MatchTeamDisplay } from '../lib/teamDisplay';
import { useTeams } from '../lib/hooks';
import { Pill } from './ui';

function TeamLine({ team, score, dim }: { team: MatchTeamDisplay; score?: number; dim?: boolean }) {
  return (
    <View style={styles.teamLine}>
      <Text style={styles.flag}>{team.flag}</Text>
      <Text style={[styles.teamName, dim && { color: colors.textMuted }]} numberOfLines={1}>
        {team.name}
      </Text>
      {score != null && <Text style={[styles.score, dim && { color: colors.textMuted }]}>{score}</Text>}
    </View>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const router = useRouter();
  const { data: teams } = useTeams();
  const home = getMatchTeam(match, 'home', teams);
  const away = getMatchTeam(match, 'away', teams);
  const displayState = getMatchDisplayState(match);
  const isLive = displayState === 'live';
  const isFinished = displayState === 'finished';
  const isAwaitingLive = displayState === 'awaiting-live-update';
  const isResultPending = displayState === 'result-pending';
  const showScore = hasVerifiedScore(match) && (isLive || isFinished);
  const homeWon = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {match.group && <Text style={styles.meta}>Group {match.group}</Text>}
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {match.city}
          </Text>
        </View>
        {isLive ? (
          <Pill label={`${match.minute}'`} tone="live" />
        ) : isFinished ? (
          <Text style={styles.statusFinal}>FT</Text>
        ) : isAwaitingLive ? (
          <Text style={styles.statusPending}>Updating</Text>
        ) : isResultPending ? (
          <Text style={styles.statusPending}>Result pending</Text>
        ) : (
          <Text style={styles.statusTime}>{kickoffTime(match.kickoff)}</Text>
        )}
      </View>

      <View style={styles.teams}>
        <TeamLine team={home} score={showScore ? match.homeScore : undefined} dim={isFinished && !homeWon} />
        <TeamLine team={away} score={showScore ? match.awayScore : undefined} dim={isFinished && !awayWon} />
      </View>

      {isLive && (
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
      {(isAwaitingLive || isResultPending) && (
        <Text style={styles.pendingText}>
          {isAwaitingLive ? 'Kickoff passed. Waiting for live provider update.' : 'Kickoff passed. Official result unavailable.'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    gap: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  meta: { color: colors.textFaint, fontSize: font.size.xs, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  metaDot: { color: colors.textFaint, fontSize: font.size.xs },
  statusTime: { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  statusFinal: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  statusPending: { color: colors.accent, fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  teams: { gap: space.sm, marginTop: 2 },
  teamLine: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flag: { fontSize: 20 },
  teamName: { flex: 1, color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  score: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy as TextStyle['fontWeight'], minWidth: 20, textAlign: 'right' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live },
  liveText: { color: colors.live, fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'], letterSpacing: 0 },
  pendingText: { color: colors.textFaint, fontSize: font.size.xs, marginTop: 2 },
});
