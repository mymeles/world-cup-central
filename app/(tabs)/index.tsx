import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, useWindowDimensions, TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, space } from '../../constants/theme';
import { CentralMasthead } from '../../components/CentralMasthead';
import { AnalystPanel, DashboardMatchRow, ShowpieceMatchCard, TournamentGlance } from '../../components/WorldCupDashboard';
import { useMatches, useMatchDetail, useTeams } from '../../lib/hooks';
import { dayKey, todayKey, venueLabel } from '../../lib/format';
import { getMatchDisplayState } from '../../lib/matchStatus';
import { TEAMS, VENUES } from '../../data/worldcup';

const TODAY_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { data: matches, isLoading } = useMatches();
  const { data: teams } = useTeams();
  const isWide = width >= 900;
  const today = todayKey();

  const todaysMatches = useMemo(
    () => (matches ?? []).filter((match) => dayKey(match.kickoff) === today),
    [matches, today],
  );

  const showpiece = useMemo(() => {
    const all = matches ?? [];
    return (
      todaysMatches.find((match) => getMatchDisplayState(match) === 'live') ??
      todaysMatches.find((match) => getMatchDisplayState(match) === 'scheduled') ??
      todaysMatches[0] ??
      all.find((match) => getMatchDisplayState(match) === 'scheduled') ??
      all[0]
    );
  }, [matches, todaysMatches]);

  // Pull the featured match's detail so the showpiece card can show goal scorers + minutes.
  const { data: showpieceDetail } = useMatchDetail(showpiece?.id ?? '');

  const stats = useMemo(() => {
    const all = matches ?? [];
    const finished = all.filter((match) => match.status === 'finished');
    const goals = finished.reduce((sum, match) => sum + (match.homeScore ?? 0) + (match.awayScore ?? 0), 0);
    const venueCount = new Set(all.map(venueLabel).filter(Boolean)).size || VENUES.length;
    return {
      goals,
      goalsPerMatch: finished.length ? goals / finished.length : 0,
      venuesCount: venueCount,
      matchesCount: all.length,
      teamsCount: teams?.length ?? TEAMS.length,
    };
  }, [matches, teams]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.phoneShell}>
          <CentralMasthead />

          {isLoading || !showpiece ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            (() => {
              const showpieceBlock = (
                <ShowpieceMatchCard
                  match={showpiece}
                  teams={teams}
                  events={showpieceDetail?.events}
                  onAction={(action) => router.push(`/match/${showpiece.id}?tab=${action}`)}
                />
              );

              const matchesBlock = (
                <View style={styles.matchesBlock}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>TODAY'S MATCHES</Text>
                    <Pressable style={styles.seeAll} accessibilityRole="button" onPress={() => router.push('/groups')}>
                      <Text style={styles.seeAllText}>See all</Text>
                    </Pressable>
                  </View>
                  <View style={styles.matchList}>
                    {todaysMatches.length ? (
                      todaysMatches.map((match) => <DashboardMatchRow key={match.id} match={match} teams={teams} isWide={isWide} />)
                    ) : (
                      <View style={styles.emptyToday}>
                        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
                        <Text style={styles.emptyTodayText}>No matches listed for {TODAY_FMT.format(new Date())}.</Text>
                      </View>
                    )}
                  </View>
                </View>
              );

              const analystBlock = <AnalystPanel match={showpiece} teams={teams} />;
              const glanceBlock = <TournamentGlance {...stats} />;

              // Wide: two-column dashboard — live card + fixtures on the left,
              // analyst + tournament stats in a right rail. Narrow: single stack.
              return isWide ? (
                <View style={[styles.content, styles.dashRow]}>
                  <View style={styles.mainCol}>
                    {showpieceBlock}
                    {matchesBlock}
                  </View>
                  <View style={styles.sideRail}>
                    {analystBlock}
                    {glanceBlock}
                  </View>
                </View>
              ) : (
                <View style={styles.content}>
                  {showpieceBlock}
                  {matchesBlock}
                  {analystBlock}
                  {glanceBlock}
                </View>
              );
            })()
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 92 },
  phoneShell: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    backgroundColor: colors.bg,
  },
  loadingWrap: { padding: space.xxxl, alignItems: 'center', justifyContent: 'center' },
  content: { padding: space.lg, gap: space.md },
  dashRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg },
  mainCol: { flex: 1.9, gap: space.md },
  sideRail: { flex: 1, gap: space.md, minWidth: 320, maxWidth: 420 },
  matchesBlock: { gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: {
    color: colors.ink,
    fontSize: font.size.lg,
    fontWeight: font.weight.heavy as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  seeAll: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: radius.sm },
  seeAllText: { color: colors.blue, fontSize: font.size.sm, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  matchList: { gap: 8 },
  emptyToday: {
    minHeight: 70,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space.lg,
  },
  emptyTodayText: { color: colors.textMuted, fontSize: font.size.sm, flex: 1 },
});
