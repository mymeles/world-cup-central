import React from 'react';
import { View, Text, StyleSheet, Pressable, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space, font, glow, bubble } from '../constants/theme';
import type { Match } from '../types';
import { predictMatch } from '../lib/predict';
import { kickoffTime, pct, venueLabel } from '../lib/format';
import { getMatchDisplayState, hasVerifiedScore } from '../lib/matchStatus';
import { getMatchTeam, type MatchTeamDisplay } from '../lib/teamDisplay';
import { useTeams } from '../lib/hooks';

function TeamRow({ team, score, dim }: { team: MatchTeamDisplay; score?: number; dim?: boolean }) {
  return (
    <View style={styles.teamRow}>
      <Text style={styles.flag}>{team.flag}</Text>
      <Text style={[styles.teamName, dim && { color: colors.textMuted }]} numberOfLines={1}>
        {team.name}
      </Text>
      {score != null && <Text style={[styles.score, dim && { color: colors.textMuted }]}>{score}</Text>}
    </View>
  );
}

export function FeaturedMatchCard({ match, index = 0 }: { match: Match; index?: number }) {
  const router = useRouter();
  const theme = bubble[index % bubble.length];
  const { data: teams } = useTeams();
  const home = getMatchTeam(match, 'home', teams);
  const away = getMatchTeam(match, 'away', teams);
  const p = home.knownTeam && away.knownTeam ? predictMatch(home.knownTeam, away.knownTeam) : undefined;
  const fav = p && p.homeWin >= p.awayWin ? home : away;
  const favPct = p ? Math.max(p.homeWin, p.awayWin) : 0;

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
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      <LinearGradient
        colors={theme.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: theme.accent + '55' }, glow(theme.accent)]}
      >
        {/* Status / kickoff */}
        <View style={styles.header}>
          {isLive ? (
            <View style={[styles.statusChip, { backgroundColor: colors.liveSoft }]}>
              <View style={styles.liveDot} />
              <Text style={[styles.statusText, { color: colors.live }]}>LIVE {match.minute}'</Text>
            </View>
          ) : isFinished ? (
            <View style={[styles.statusChip, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.statusText, { color: colors.textMuted }]}>FULL TIME</Text>
            </View>
          ) : isAwaitingLive || isResultPending ? (
            <View style={[styles.statusChip, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="sync" size={12} color={colors.accent} />
              <Text style={[styles.statusText, { color: colors.accent }]}>
                {isAwaitingLive ? 'UPDATING' : 'RESULT PENDING'}
              </Text>
            </View>
          ) : (
            <View style={[styles.statusChip, { backgroundColor: theme.accent + '22' }]}>
              <Ionicons name="time-outline" size={12} color={theme.accent} />
              <Text style={[styles.statusText, { color: theme.accent }]}>{kickoffTime(match.kickoff)}</Text>
            </View>
          )}
          <Text style={styles.stageTag}>{match.group ? `Group ${match.group}` : match.source ?? 'Provider'}</Text>
        </View>

        {/* Teams */}
        <View style={styles.teams}>
          <TeamRow team={home} score={showScore ? match.homeScore : undefined} dim={isFinished && !homeWon} />
          <TeamRow team={away} score={showScore ? match.awayScore : undefined} dim={isFinished && !awayWon} />
        </View>

        {(isAwaitingLive || isResultPending) && (
          <Text style={styles.pendingText}>
            {isAwaitingLive ? 'Kickoff has passed; waiting for live data.' : 'Official result unavailable from the provider.'}
          </Text>
        )}

        {/* Venue */}
        <View style={styles.venueRow}>
          <Ionicons name="location" size={13} color={colors.textMuted} />
          <Text style={styles.venueText} numberOfLines={1}>
            {venueLabel(match)}
          </Text>
        </View>

        {/* Forecast */}
        {p ? (
          <View style={styles.forecast}>
            <View style={styles.probBar}>
              <View style={{ flex: p.homeWin, backgroundColor: theme.accent }} />
              <View style={{ flex: p.draw, backgroundColor: colors.draw }} />
              <View style={{ flex: p.awayWin, backgroundColor: colors.surfaceHover }} />
            </View>
            <View style={[styles.pickPill, { backgroundColor: theme.accent + '22' }]}>
              <Ionicons name="flash" size={11} color={theme.accent} />
              <Text style={[styles.pickText, { color: theme.accent }]}>{fav.id} {pct(favPct)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.providerRow}>
            <Ionicons name="radio-outline" size={13} color={theme.accent} />
            <Text style={[styles.providerText, { color: theme.accent }]}>Live provider fixture</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.bubble,
    borderWidth: 1,
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  statusText: { fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'], letterSpacing: 0 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live },
  stageTag: { color: colors.textFaint, fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'], textTransform: 'uppercase', letterSpacing: 0 },
  teams: { gap: 10 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flag: { fontSize: 26 },
  teamName: { flex: 1, color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  score: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy as TextStyle['fontWeight'], minWidth: 18, textAlign: 'right' },
  pendingText: { color: colors.textMuted, fontSize: font.size.xs, marginTop: -4 },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  venueText: { flex: 1, color: colors.textMuted, fontSize: font.size.sm, fontWeight: font.weight.medium as TextStyle['fontWeight'] },
  forecast: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  probBar: { flex: 1, flexDirection: 'row', height: 7, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.surfaceAlt },
  pickPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  pickText: { fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  providerText: { fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
});
