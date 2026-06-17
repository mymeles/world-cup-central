import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions, TextStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, shadow, space } from '../../constants/theme';
import { CentralMasthead } from '../../components/CentralMasthead';
import { AnalystPanel, ShowpieceMatchCard, type ShowpieceAction } from '../../components/WorldCupDashboard';
import type { Lineup, LineupPlayer, MatchEvent } from '../../lib/dataProvider';
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

function feedIcon(type: string | null): { name: keyof typeof Ionicons.glyphMap; color: string } {
  switch (type) {
    case 'goal':
      return { name: 'football', color: colors.primary };
    case 'yellow-card':
      return { name: 'square', color: colors.accent };
    case 'red-card':
      return { name: 'square', color: colors.live };
    case 'substitution':
      return { name: 'swap-horizontal', color: colors.blue };
    default:
      return { name: 'ellipse', color: colors.textMuted };
  }
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
            {events.map((event) => {
              const ic = feedIcon(event.type);
              return (
                <View key={event.id} style={styles.feedRow}>
                  <Ionicons name={ic.name} size={16} color={ic.color} />
                  <Text style={styles.feedMinute}>{event.minute != null ? `${event.minute}'` : ''}</Text>
                  <Text style={styles.feedText}>{event.detail ?? event.type ?? 'Match event'}</Text>
                </View>
              );
            })}
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

function lastNameOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : name;
}

function PitchPlayer({ player, color, leftPct, topPct }: { player: LineupPlayer; color: string; leftPct: number; topPct: number }) {
  return (
    <View style={[styles.pitchPlayer, { left: `${leftPct}%`, top: `${topPct}%` }]}>
      {player.image ? (
        <Image source={{ uri: player.image }} style={[styles.pitchAvatar, { borderColor: color }]} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.pitchAvatar, styles.pitchAvatarFallback, { borderColor: color }]}>
          <Text style={[styles.pitchAvatarNum, { color }]}>{player.number ?? ''}</Text>
        </View>
      )}
      <View style={styles.pitchNameWrap}>
        <Text style={styles.pitchName} numberOfLines={1}>{lastNameOf(player.name)}</Text>
      </View>
    </View>
  );
}

function PitchLineup({ homeLineup, awayLineup }: { homeLineup?: Lineup; awayLineup?: Lineup }) {
  const homeStarters = (homeLineup?.players ?? []).filter((p) => p.isStarter);
  const awayStarters = (awayLineup?.players ?? []).filter((p) => p.isStarter);
  return (
    <LinearGradient colors={['#1FA83F', '#138030']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.pitch}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={[styles.pitchStripe, { top: `${i * 12.5}%`, opacity: i % 2 ? 0.08 : 0 }]} />
      ))}
      <View style={styles.pitchHalfLine} />
      <View style={styles.pitchCenter} />
      <View style={[styles.pitchBox, styles.pitchBoxTop]} />
      <View style={[styles.pitchBox, styles.pitchBoxBottom]} />
      {/* Away team attacks downward (rotated to the top half). */}
      {awayStarters.map((p) => (
        <PitchPlayer key={p.playerId} player={p} color={colors.coral} leftPct={(1 - p.gridX) * 100} topPct={8 + p.gridY * 40} />
      ))}
      {/* Home team attacks upward from the bottom half. */}
      {homeStarters.map((p) => (
        <PitchPlayer key={p.playerId} player={p} color={colors.cyan} leftPct={p.gridX * 100} topPct={92 - p.gridY * 40} />
      ))}
    </LinearGradient>
  );
}

function SubsColumn({ team, lineup, color }: { team: MatchTeamDisplay; lineup?: Lineup; color: string }) {
  const subs = (lineup?.players ?? []).filter((p) => !p.isStarter);
  return (
    <View style={styles.subsCol}>
      <View style={styles.subsTeamRow}>
        <Text style={styles.subsFlag}>{team.flag}</Text>
        <Text style={[styles.subsTeam, { color }]} numberOfLines={1}>{team.id}</Text>
      </View>
      {subs.length ? (
        subs.slice(0, 12).map((p) => (
          <Text key={p.playerId} style={styles.subText} numberOfLines={1}>
            <Text style={styles.subNum}>{p.number ?? '–'} </Text>
            {lastNameOf(p.name)}
          </Text>
        ))
      ) : (
        <Text style={styles.subText}>—</Text>
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

  const hasSubs = [homeLineup, awayLineup].some((l) => (l?.players ?? []).some((p) => !p.isStarter));

  return (
    <View style={styles.infoCard}>
      <View style={styles.lineupHeader}>
        <View style={styles.lineupTeamTag}>
          <Text style={styles.lineupFlag}>{home.flag}</Text>
          <Text style={styles.lineupTeamName} numberOfLines={1}>{home.id}</Text>
          {homeLineup?.formation ? <Text style={[styles.formBadge, { color: colors.cyan, backgroundColor: colors.cyanSoft }]}>{homeLineup.formation}</Text> : null}
        </View>
        <Text style={styles.lineupVs}>v</Text>
        <View style={[styles.lineupTeamTag, styles.lineupTeamTagRight]}>
          {awayLineup?.formation ? <Text style={[styles.formBadge, { color: colors.coral, backgroundColor: colors.coralSoft }]}>{awayLineup.formation}</Text> : null}
          <Text style={styles.lineupTeamName} numberOfLines={1}>{away.id}</Text>
          <Text style={styles.lineupFlag}>{away.flag}</Text>
        </View>
      </View>

      <PitchLineup homeLineup={homeLineup} awayLineup={awayLineup} />

      {hasSubs ? (
        <>
          <Text style={styles.subsHeading}>SUBSTITUTES</Text>
          <View style={styles.subsRow}>
            <SubsColumn team={home} lineup={homeLineup} color={colors.cyan} />
            <SubsColumn team={away} lineup={awayLineup} color={colors.coral} />
          </View>
        </>
      ) : null}
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
  emptyLineup: { alignItems: 'center', gap: space.sm, paddingVertical: space.sm, flexDirection: 'row' },

  // Pitch lineup
  lineupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  lineupTeamTag: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineupTeamTagRight: { justifyContent: 'flex-end' },
  lineupFlag: { fontSize: 20 },
  lineupTeamName: { color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  lineupVs: { color: colors.textFaint, fontSize: font.size.sm, fontWeight: font.weight.bold as TextStyle['fontWeight'], paddingHorizontal: 8 },
  formBadge: { fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'], borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  pitch: {
    width: '100%',
    aspectRatio: 0.66,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pitchStripe: { position: 'absolute', left: 0, right: 0, height: '12.5%', backgroundColor: '#FFFFFF' },
  pitchHalfLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  pitchCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 84,
    height: 84,
    marginLeft: -42,
    marginTop: -42,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pitchBox: { position: 'absolute', left: '22%', right: '22%', height: '13%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  pitchBoxTop: { top: 0, borderTopWidth: 0 },
  pitchBoxBottom: { bottom: 0, borderBottomWidth: 0 },
  pitchPlayer: { position: 'absolute', width: 58, marginLeft: -29, marginTop: -21, alignItems: 'center' },
  pitchAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, backgroundColor: colors.surface },
  pitchAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  pitchAvatarNum: { fontSize: font.size.md, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  pitchNameWrap: { marginTop: 3, maxWidth: 58, backgroundColor: 'rgba(7,19,35,0.45)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  pitchName: { color: '#FFFFFF', fontSize: 9.5, fontWeight: font.weight.bold as TextStyle['fontWeight'], textAlign: 'center' },
  subsHeading: { color: colors.ink, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'], marginTop: space.lg, marginBottom: space.sm, letterSpacing: 0.5 },
  subsRow: { flexDirection: 'row', gap: space.lg },
  subsCol: { flex: 1, gap: 4 },
  subsTeamRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  subsFlag: { fontSize: 16 },
  subsTeam: { fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  subText: { color: colors.textMuted, fontSize: font.size.sm, lineHeight: 19 },
  subNum: { color: colors.textFaint, fontWeight: font.weight.bold as TextStyle['fontWeight'] },

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
