import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions, TextStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, shadow, space } from '../../constants/theme';
import { CentralMasthead } from '../../components/CentralMasthead';
import { AnalystPanel, ShowpieceMatchCard, type ShowpieceAction } from '../../components/WorldCupDashboard';
import type { Lineup, MatchEvent } from '../../lib/dataProvider';
import type { Match, MatchPrediction } from '../../types';
import type { MatchDisplayState } from '../../lib/matchStatus';
import { useMatchDetail, useTeams } from '../../lib/hooks';
import { getMatchTeam, type MatchTeamDisplay } from '../../lib/teamDisplay';
import { predictMatch } from '../../lib/predict';
import { kickoffTime, pct, venueLabel } from '../../lib/format';
import { getMatchDisplayState, hasVerifiedScore } from '../../lib/matchStatus';

const ACTION_TABS: ShowpieceAction[] = ['stats', 'lineups', 'watch'];
function asTab(value: unknown): ShowpieceAction {
  return ACTION_TABS.includes(value as ShowpieceAction) ? (value as ShowpieceAction) : 'stats';
}

function ProbabilityRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.probRow}>
      <Text style={styles.probLabel}>{label}</Text>
      <View style={styles.probTrack}>
        <View style={[styles.probFill, { width: `${Math.round(value * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.probValue}>{pct(value)}</Text>
    </View>
  );
}

function CompareRow({ label, home, away }: { label: string; home: string; away: string }) {
  return (
    <View style={styles.compareRow}>
      <Text style={[styles.compareVal, { textAlign: 'left' }]}>{home}</Text>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={[styles.compareVal, { textAlign: 'right' }]}>{away}</Text>
    </View>
  );
}

function StatsTab({
  home,
  away,
  prediction,
  fav,
  events,
}: {
  home: MatchTeamDisplay;
  away: MatchTeamDisplay;
  prediction?: MatchPrediction;
  fav: MatchTeamDisplay;
  events: MatchEvent[];
}) {
  const rank = (t: MatchTeamDisplay) => (t.knownTeam?.rank ? `#${t.knownTeam.rank}` : '—');
  return (
    <>
      {prediction ? (
        <View style={styles.infoCard}>
          <View style={styles.infoHead}>
            <Text style={styles.infoTitle}>MATCH PREDICTION</Text>
            <View style={styles.favoritePill}>
              <Text style={styles.favoriteText}>{fav.id} {pct(Math.max(prediction.homeWin, prediction.awayWin))}</Text>
            </View>
          </View>
          <Text style={styles.predictionCopy}>
            {fav.name} have the model lean. Expected goals: {home.name} {prediction.expHomeGoals.toFixed(2)}, {away.name} {prediction.expAwayGoals.toFixed(2)}.
          </Text>
          <View style={styles.probStack}>
            <ProbabilityRow label={`${home.id} win`} value={prediction.homeWin} color={colors.primary} />
            <ProbabilityRow label="Draw" value={prediction.draw} color={colors.textMuted} />
            <ProbabilityRow label={`${away.id} win`} value={prediction.awayWin} color={colors.blue} />
          </View>
        </View>
      ) : null}

      {home.knownTeam && away.knownTeam ? (
        <View style={styles.infoCard}>
          <View style={styles.compareHead}>
            <Text style={styles.compareTeam}>{home.flag} {home.id}</Text>
            <Text style={styles.infoTitle}>HEAD TO HEAD</Text>
            <Text style={[styles.compareTeam, { textAlign: 'right' }]}>{away.id} {away.flag}</Text>
          </View>
          <CompareRow label="FIFA ranking" home={rank(home)} away={rank(away)} />
          <CompareRow label="Power rating" home={`${home.knownTeam.rating}`} away={`${away.knownTeam.rating}`} />
          {prediction ? (
            <CompareRow label="Expected goals" home={prediction.expHomeGoals.toFixed(2)} away={prediction.expAwayGoals.toFixed(2)} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>MATCH FEED</Text>
        {events.length ? (
          <View style={styles.feedList}>
            {events.map((event) => (
              <View key={event.id} style={styles.feedRow}>
                <Ionicons name="football" size={16} color={colors.primary} />
                <Text style={styles.feedMinute}>{event.minute ?? ''}'</Text>
                <Text style={styles.feedText}>{event.detail ?? event.type ?? 'Match event'}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyFeed}>
            No verified event feed has been returned for this fixture yet. The card will update when provider events arrive.
          </Text>
        )}
      </View>
    </>
  );
}

function TeamLineup({ team, lineup }: { team: MatchTeamDisplay; lineup?: Lineup }) {
  const starters = (lineup?.players ?? []).filter((p) => p.isStarter).sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  return (
    <View style={styles.lineupCard}>
      <View style={styles.lineupHead}>
        <Text style={styles.lineupFlag}>{team.flag}</Text>
        <Text style={styles.lineupName} numberOfLines={1}>{team.name}</Text>
        {lineup?.formation ? <Text style={styles.lineupFormation}>{lineup.formation}</Text> : null}
      </View>
      {starters.length ? (
        starters.map((p) => (
          <View key={p.playerId} style={styles.playerRow}>
            <Text style={styles.playerNum}>{p.number ?? '–'}</Text>
            <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
            {p.position ? <Text style={styles.playerPos}>{p.position}</Text> : null}
          </View>
        ))
      ) : (
        <Text style={styles.lineupPending}>Lineup pending</Text>
      )}
    </View>
  );
}

function LineupsTab({ lineups, home, away }: { lineups: Lineup[]; home: MatchTeamDisplay; away: MatchTeamDisplay }) {
  const homeLineup = lineups.find((l) => l.teamId === home.id);
  const awayLineup = lineups.find((l) => l.teamId === away.id);

  if (!homeLineup && !awayLineup) {
    return (
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>LINEUPS</Text>
        <View style={styles.emptyLineup}>
          <Ionicons name="shirt-outline" size={30} color={colors.textFaint} />
          <Text style={styles.emptyFeed}>
            Confirmed lineups usually land about an hour before kickoff. They'll appear here as soon as the provider publishes them.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.lineupGrid}>
      <TeamLineup team={home} lineup={homeLineup} />
      <TeamLineup team={away} lineup={awayLineup} />
    </View>
  );
}

const US_BROADCASTERS = [
  { name: 'FOX / FS1', kind: 'English · TV', icon: 'tv' as const },
  { name: 'Telemundo / Universo', kind: 'Spanish · TV', icon: 'tv' as const },
  { name: 'Fox Sports app · Peacock', kind: 'Streaming', icon: 'phone-portrait' as const },
];

function WatchTab({ match, home, away, state }: { match: Match; home: MatchTeamDisplay; away: MatchTeamDisplay; state: MatchDisplayState }) {
  const heroLabel = state === 'live' ? 'Playing now' : state === 'finished' ? 'Full time' : 'Kicks off';
  const heroValue = state === 'live' ? `${match.minute ?? ''}'` : kickoffTime(match.kickoff);
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHead}>
        <Text style={styles.infoTitle}>WHERE TO WATCH</Text>
        {state === 'live' ? (
          <View style={styles.watchLivePill}>
            <View style={styles.watchLiveDot} />
            <Text style={styles.watchLiveText}>LIVE</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.watchHero}>
        <Ionicons name="football" size={18} color={colors.primary} />
        <Text style={styles.watchHeroText}>{home.id} vs {away.id} · {heroLabel} {heroValue}</Text>
      </View>
      <Text style={styles.watchRegion}>United States</Text>
      {US_BROADCASTERS.map((b) => (
        <View key={b.name} style={styles.watchRow}>
          <View style={styles.watchIcon}>
            <Ionicons name={b.icon} size={16} color={colors.blue} />
          </View>
          <Text style={styles.watchName}>{b.name}</Text>
          <Text style={styles.watchKind}>{b.kind}</Text>
        </View>
      ))}
      <Text style={styles.watchNote}>
        Official 2026 rights holders — exact channel varies by matchday and region. Check your local listings for streaming availability.
      </Text>
    </View>
  );
}

export default function MatchDetail() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: match, isLoading } = useMatchDetail(id);
  const { data: teams } = useTeams();
  const isWide = width >= 900;
  const [activeTab, setActiveTab] = useState<ShowpieceAction>(asTab(tab));

  if (isLoading || !match) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + space.xl }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const home = getMatchTeam(match, 'home', teams);
  const away = getMatchTeam(match, 'away', teams);
  const p = home.knownTeam && away.knownTeam ? predictMatch(home.knownTeam, away.knownTeam) : undefined;
  const fav = p && p.homeWin >= p.awayWin ? home : away;
  const displayState = getMatchDisplayState(match);
  const showScore = hasVerifiedScore(match) && (displayState === 'live' || displayState === 'finished');
  const scoreText = showScore ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : kickoffTime(match.kickoff);
  const eventList = match.events.slice(0, 6);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerWrap}>
          <CentralMasthead compact />
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={[styles.back, { top: insets.top + 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={[styles.detailGrid, isWide && styles.detailGridWide]}>
            <View style={isWide ? styles.scoreCol : undefined}>
              <ShowpieceMatchCard
                match={match}
                teams={teams}
                events={eventList}
                onAction={setActiveTab}
                activeAction={activeTab}
              />
            </View>
            <View style={isWide ? styles.sideCol : undefined}>
              <AnalystPanel match={match} teams={teams} />
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoHead}>
              <Text style={styles.infoTitle}>{home.name} vs {away.name}</Text>
              <Text style={styles.infoScore}>{scoreText}</Text>
            </View>
            <View style={styles.infoLine}>
              <Ionicons name="calendar-outline" size={16} color={colors.blue} />
              <Text style={styles.infoText}>{match.group ? `Group ${match.group}` : match.stage}</Text>
            </View>
            <View style={styles.infoLine}>
              <Ionicons name="location-outline" size={16} color={colors.blue} />
              <Text style={styles.infoText}>{venueLabel(match)}</Text>
            </View>
          </View>

          <View style={styles.segmented}>
            {ACTION_TABS.map((t) => (
              <Pressable
                key={t}
                style={[styles.segment, activeTab === t && styles.segmentActive]}
                onPress={() => setActiveTab(t)}
                accessibilityRole="button"
                accessibilityState={{ selected: activeTab === t }}
              >
                <Ionicons
                  name={t === 'stats' ? 'stats-chart' : t === 'lineups' ? 'shirt' : 'play-circle'}
                  size={15}
                  color={activeTab === t ? colors.onPrimary : colors.textMuted}
                />
                <Text style={[styles.segmentText, activeTab === t && styles.segmentTextActive]}>
                  {t === 'stats' ? 'Stats' : t === 'lineups' ? 'Lineups' : 'Watch'}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === 'stats' ? (
            <StatsTab home={home} away={away} prediction={p} fav={fav} events={eventList} />
          ) : activeTab === 'lineups' ? (
            <LineupsTab lineups={match.lineups} home={home} away={away} />
          ) : (
            <WatchTab match={match} home={home} away={away} state={displayState} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 42 },
  headerWrap: { position: 'relative' },
  back: {
    position: 'absolute',
    left: space.lg,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', padding: space.lg, gap: space.xl },
  detailGrid: { gap: space.lg },
  detailGridWide: { flexDirection: 'row', alignItems: 'stretch' },
  scoreCol: { flex: 1.55 },
  sideCol: { flex: 0.82 },
  infoCard: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
    ...shadow.card,
  },
  infoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  infoTitle: { color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  infoScore: { color: colors.live, fontSize: font.size.xl, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: colors.textMuted, fontSize: font.size.sm, flex: 1 },
  favoritePill: { backgroundColor: colors.blueSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  favoriteText: { color: colors.blue, fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  predictionCopy: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 },
  probStack: { gap: space.sm },
  probRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  probLabel: { width: 66, color: colors.text, fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  probTrack: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  probFill: { height: 8, borderRadius: radius.pill },
  probValue: { width: 38, textAlign: 'right', color: colors.ink, fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  feedList: { gap: space.sm },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedMinute: { width: 36, color: colors.ink, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  feedText: { flex: 1, color: colors.textMuted, fontSize: font.size.sm },
  emptyFeed: { flex: 1, color: colors.textMuted, fontSize: font.size.sm, lineHeight: 20 },

  // Segmented tab control
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: font.size.sm, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  segmentTextActive: { color: colors.onPrimary },

  // Head-to-head comparison
  compareHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareTeam: { flex: 1, color: colors.ink, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  compareLabel: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  compareVal: { width: 70, color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },

  // Lineups
  lineupGrid: { flexDirection: 'row', gap: space.md, flexWrap: 'wrap' },
  lineupCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 4,
    ...shadow.card,
  },
  lineupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  lineupFlag: { fontSize: 22 },
  lineupName: { flex: 1, color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  lineupFormation: { color: colors.blue, fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'], backgroundColor: colors.blueSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  playerNum: { width: 22, textAlign: 'center', color: colors.textMuted, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  playerName: { flex: 1, color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  playerPos: { color: colors.textFaint, fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  lineupPending: { color: colors.textFaint, fontSize: font.size.sm, fontStyle: 'italic', paddingVertical: 6 },
  emptyLineup: { alignItems: 'center', gap: space.sm, paddingVertical: space.sm, flexDirection: 'row' },

  // Where to watch
  watchHero: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: space.md },
  watchHeroText: { flex: 1, color: colors.ink, fontSize: font.size.sm, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  watchLivePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.liveSoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  watchLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live },
  watchLiveText: { color: colors.live, fontSize: font.size.xxs, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  watchRegion: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'], marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  watchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  watchIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  watchName: { flex: 1, color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  watchKind: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  watchNote: { color: colors.textFaint, fontSize: font.size.xs, lineHeight: 17, marginTop: space.sm, fontStyle: 'italic' },
});
