import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, shadow, space } from '../constants/theme';
import type { Match, Team } from '../types';
import type { MatchEvent } from '../lib/dataProvider';
import { backendUrl } from '../lib/apiBase';
import { kickoffTime, pct, venueLabel } from '../lib/format';
import { getMatchDisplayState, hasVerifiedScore } from '../lib/matchStatus';
import { predictMatch } from '../lib/predict';
import { getMatchTeam, type MatchTeamDisplay } from '../lib/teamDisplay';

function statusLabel(match: Match) {
  const state = getMatchDisplayState(match);
  if (state === 'live') return { label: 'LIVE', meta: match.minute ? `${match.minute}'` : 'Live', color: colors.live };
  if (state === 'finished') return { label: 'FT', meta: 'Full time', color: colors.textMuted };
  return { label: 'PREVIEW', meta: kickoffTime(match.kickoff), color: colors.blue };
}

function TeamBadge({ team, align = 'left' }: { team: MatchTeamDisplay; align?: 'left' | 'right' }) {
  return (
    <View style={[styles.teamBadge, align === 'right' && { alignItems: 'flex-end' }]}>
      <View style={styles.flagBox}>
        <Text style={styles.bigFlag}>{team.flag}</Text>
      </View>
      <Text style={styles.teamCode}>{team.id}</Text>
    </View>
  );
}

function EventLine({ event, fallbackTeam }: { event: MatchEvent; fallbackTeam: MatchTeamDisplay }) {
  const name = event.detail?.replace(/^Goal\s*-\s*/i, '').trim() || fallbackTeam.name;
  return (
    <View style={styles.eventLine}>
      <Ionicons name="football" size={13} color={colors.surface} />
      <Text style={styles.eventText}>{event.minute ?? ''}' {name}</Text>
    </View>
  );
}

export type ShowpieceAction = 'watch' | 'lineups' | 'stats';

export function ShowpieceMatchCard({
  match,
  teams,
  events = [],
  onAction,
  activeAction,
}: {
  match: Match;
  teams?: Team[];
  events?: MatchEvent[];
  onAction?: (action: ShowpieceAction) => void;
  activeAction?: ShowpieceAction;
}) {
  const home = getMatchTeam(match, 'home', teams);
  const away = getMatchTeam(match, 'away', teams);
  const state = getMatchDisplayState(match);
  const showScore = hasVerifiedScore(match) && (state === 'live' || state === 'finished');
  const p = home.knownTeam && away.knownTeam ? predictMatch(home.knownTeam, away.knownTeam) : undefined;
  const fav = p && p.homeWin >= p.awayWin ? home : away;
  const favPct = p ? Math.max(p.homeWin, p.awayWin) : 0;
  const status = statusLabel(match);
  const goals = events.filter((event) => event.type === 'goal');
  const homeEvents = goals.filter((event) => event.teamId === home.id).slice(0, 3);
  const awayEvents = goals.filter((event) => event.teamId === away.id).slice(0, 3);

  return (
    <View style={styles.showpieceShell}>
      <LinearGradient colors={['#21B514', '#149E19']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pitch}>
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={i} style={[styles.pitchStripe, { left: `${i * 12.5}%`, opacity: i % 2 ? 0.08 : 0.03 }]} />
        ))}

        <View style={styles.pitchTop}>
          <View style={[styles.liveChip, { backgroundColor: status.color }]}>
            <Text style={styles.liveChipText}>{status.label}</Text>
          </View>
          <Text style={styles.minuteText}>{status.meta}</Text>
          <View style={styles.pitchMeta}>
            <Text style={styles.pitchMetaText}>{match.group ? `Group ${match.group}` : match.stage}</Text>
            <Text style={styles.weather}>☀ 28°C</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <TeamBadge team={home} />
          <View style={styles.scoreCenter}>
            <Text style={styles.scoreText}>
              {showScore ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : 'VS'}
            </Text>
            <Text style={styles.subScore}>
              {showScore ? (state === 'finished' ? 'FINAL' : 'HT 1-0') : kickoffTime(match.kickoff)}
            </Text>
          </View>
          <TeamBadge team={away} align="right" />
        </View>

        <View style={styles.eventsRow}>
          <View style={styles.eventsCol}>
            {homeEvents.length ? homeEvents.map((event) => <EventLine key={event.id} event={event} fallbackTeam={home} />) : null}
          </View>
          <View style={[styles.eventsCol, { alignItems: 'flex-end' }]}>
            {awayEvents.length ? awayEvents.map((event) => <EventLine key={event.id} event={event} fallbackTeam={away} />) : null}
          </View>
        </View>

        <View style={styles.timeline}>
          <View style={[styles.timelineFill, { width: p ? `${Math.round(favPct * 100)}%` : '52%' }]} />
          <View style={[styles.ballMarker, { left: p ? `${Math.round(favPct * 82)}%` : '48%' }]}>
            <Ionicons name="football" size={16} color={colors.ink} />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.actionBar}>
        <Pressable
          style={({ pressed }) => [styles.actionItem, activeAction === 'watch' && styles.actionItemActive, pressed && { opacity: 0.7 }]}
          onPress={() => onAction?.('watch')}
          accessibilityRole="button"
          accessibilityLabel="Where to watch live"
          accessibilityState={{ selected: activeAction === 'watch' }}
        >
          <View style={styles.actionIconLive}>
            <Ionicons name="play" size={13} color={colors.onPrimary} />
          </View>
          <Text style={[styles.actionText, { color: colors.live }]}>Watch Live</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable
          style={({ pressed }) => [styles.actionItem, activeAction === 'lineups' && styles.actionItemActive, pressed && { opacity: 0.7 }]}
          onPress={() => onAction?.('lineups')}
          accessibilityRole="button"
          accessibilityLabel="Lineups"
          accessibilityState={{ selected: activeAction === 'lineups' }}
        >
          <Ionicons name="shirt" size={19} color={colors.blue} />
          <Text style={styles.actionText}>Lineups</Text>
        </Pressable>
        <View style={styles.actionDivider} />
        <Pressable
          style={({ pressed }) => [styles.actionItem, activeAction === 'stats' && styles.actionItemActive, pressed && { opacity: 0.7 }]}
          onPress={() => onAction?.('stats')}
          accessibilityRole="button"
          accessibilityLabel="Match stats"
          accessibilityState={{ selected: activeAction === 'stats' }}
        >
          <Ionicons name="stats-chart" size={18} color={colors.primary} />
          <Text style={styles.actionText}>Stats</Text>
        </Pressable>
      </View>

      <View style={styles.showpieceFoot}>
        <Ionicons name="location" size={13} color={colors.textMuted} />
        <Text style={styles.showpieceVenue} numberOfLines={1}>{venueLabel(match)}</Text>
        {p ? <Text style={styles.showpieceForecast}>{fav.id} {pct(favPct)}</Text> : null}
      </View>
    </View>
  );
}

/** Resolve the right-hand call-to-action shown on a match row in the wide layout. */
function rowAction(state: ReturnType<typeof getMatchDisplayState>) {
  if (state === 'live') return { label: 'Watch', icon: 'play' as const, color: colors.live };
  if (state === 'finished') return { label: 'Recap', icon: 'stats-chart' as const, color: colors.primaryDim };
  return { label: 'Preview', icon: 'play-outline' as const, color: colors.blue };
}

export function DashboardMatchRow({ match, teams, isWide = false }: { match: Match; teams?: Team[]; isWide?: boolean }) {
  const router = useRouter();
  const home = getMatchTeam(match, 'home', teams);
  const away = getMatchTeam(match, 'away', teams);
  const state = getMatchDisplayState(match);
  const showScore = hasVerifiedScore(match) && (state === 'live' || state === 'finished');
  const status = statusLabel(match);
  const action = rowAction(state);
  const [subscribed, setSubscribed] = useState(false);

  const open = useCallback(() => router.push(`/match/${match.id}`), [router, match.id]);

  return (
    <View style={styles.matchRow}>
      <View style={[styles.rowRail, { backgroundColor: action.color }]} />
      <Pressable
        style={styles.rowMain}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Open ${home.name} versus ${away.name}`}
      >
        <View style={styles.rowTime}>
          <Text style={[styles.rowStatus, { color: status.color }]}>{state === 'scheduled' ? kickoffTime(match.kickoff) : status.label}</Text>
          <Text style={styles.rowGroup}>{match.group ? `Group ${match.group}` : match.stage}</Text>
        </View>
        <View style={styles.rowTeam}>
          <Text style={styles.rowFlag}>{home.flag}</Text>
          <Text style={styles.rowCode}>{home.id}</Text>
        </View>
        <Text style={styles.rowScore}>{showScore ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : 'VS'}</Text>
        <View style={styles.rowTeamRight}>
          <Text style={styles.rowCode}>{away.id}</Text>
          <Text style={styles.rowFlag}>{away.flag}</Text>
        </View>
      </Pressable>
      <View style={styles.rowActions}>
        <Pressable
          onPress={() => setSubscribed((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={subscribed ? `Mute alerts for ${home.id} versus ${away.id}` : `Get alerts for ${home.id} versus ${away.id}`}
          accessibilityState={{ selected: subscribed }}
        >
          <Ionicons
            name={subscribed ? 'notifications' : 'notifications-outline'}
            size={21}
            color={subscribed ? colors.live : colors.textMuted}
          />
        </Pressable>
        {isWide ? (
          <Pressable
            style={({ pressed }) => [styles.rowCta, { borderColor: action.color }, pressed && { opacity: 0.7 }]}
            onPress={open}
            accessibilityRole="button"
            accessibilityLabel={`${action.label} ${home.name} versus ${away.name}`}
          >
            <Ionicons name={action.icon} size={13} color={action.color} />
            <Text style={[styles.rowCtaText, { color: action.color }]}>{action.label}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.rowChevron}
            onPress={open}
            accessibilityRole="button"
            accessibilityLabel={`Open details for ${home.name} versus ${away.name}`}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.blue} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

interface AnalystMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

export function AnalystPanel({ match, teams }: { match?: Match; teams?: Team[] }) {
  const home = match ? getMatchTeam(match, 'home', teams) : undefined;
  const away = match ? getMatchTeam(match, 'away', teams) : undefined;
  const p = home?.knownTeam && away?.knownTeam ? predictMatch(home.knownTeam, away.knownTeam) : undefined;
  const fav = p && home && away ? (p.homeWin >= p.awayWin ? home : away) : home;
  const underdog = fav && home && away ? (fav.id === home.id ? away : home) : away;
  const insight =
    match && p && fav && underdog
      ? `${fav.name} have the model edge at ${pct(Math.max(p.homeWin, p.awayWin))}. ${underdog.name}'s path is keeping transitions clean and turning set pieces into shots.`
      : 'Ask anything about the tournament. The analyst is grounded in the live match database and current standings.';

  const suggestions = [
    `Why is ${fav?.name ?? 'this team'} favored?`,
    "Who's likely to score next?",
    `How can ${underdog?.name ?? 'the opponent'} respond?`,
  ];

  const [thread, setThread] = useState<AnalystMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || loading) return;
      const userMsg: AnalystMsg = { id: `u${Date.now()}`, role: 'user', content };
      const next = [...thread, userMsg];
      setThread(next);
      setInput('');
      setLoading(true);
      try {
        const res = await fetch(backendUrl('/api/ai/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
        });
        const data = (await res.json().catch(() => null)) as { text?: unknown; mode?: string } | null;
        if (!res.ok || !data || typeof data.text !== 'string') throw new Error('The analyst is unavailable right now.');
        setThread((prev) => [...prev, { id: `a${Date.now()}`, role: 'assistant', content: data.text as string, isError: data.mode === 'error' }]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Please try again.';
        setThread((prev) => [...prev, { id: `a${Date.now()}`, role: 'assistant', content: `I had trouble connecting. ${message}`, isError: true }]);
      } finally {
        setLoading(false);
      }
    },
    [thread, loading],
  );

  const hasThread = thread.length > 0;

  return (
    <View style={styles.analystCard}>
      <View style={styles.analystHead}>
        <View style={styles.analystTitleRow}>
          <Ionicons name="sparkles" size={18} color={colors.pink} />
          <Text style={styles.analystTitle}>AI ANALYST</Text>
        </View>
        <View style={styles.betaPill}>
          <Text style={styles.betaText}>BETA</Text>
        </View>
      </View>

      {hasThread ? (
        <ScrollView
          ref={scrollRef}
          style={styles.analystThread}
          contentContainerStyle={styles.analystThreadContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {thread.map((m) =>
            m.role === 'user' ? (
              <View key={m.id} style={styles.analystUserBubble}>
                <Text style={styles.analystUserText}>{m.content}</Text>
              </View>
            ) : (
              <View key={m.id} style={[styles.analystReplyBubble, m.isError && styles.analystReplyError]}>
                <Text style={styles.analystReplyText}>{m.content}</Text>
              </View>
            ),
          )}
          {loading ? (
            <View style={styles.analystTyping}>
              <ActivityIndicator size="small" color={colors.pink} />
              <Text style={styles.analystTypingText}>Analysing…</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.analystBody}>
          <Text style={styles.analystBall}>⚽️</Text>
          <Text style={styles.analystCopy}>{insight}</Text>
        </View>
      )}

      <View style={styles.questions}>
        {suggestions.map((q) => (
          <Pressable
            key={q}
            style={({ pressed }) => [styles.questionChip, pressed && styles.questionChipPressed]}
            onPress={() => send(q)}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={`Ask the analyst: ${q}`}
          >
            <Text style={styles.questionChipText}>{q}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.askBar}>
        <TextInput
          style={styles.askInput}
          placeholder="Ask anything..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          editable={!loading}
          accessibilityLabel="Ask the AI analyst about this match"
        />
        <Pressable
          style={({ pressed }) => [styles.askButton, (pressed || !input.trim() || loading) && { opacity: 0.55 }]}
          onPress={() => send(input)}
          disabled={!input.trim() || loading}
          accessibilityRole="button"
          accessibilityLabel="Send question to AI analyst"
        >
          <Ionicons name="paper-plane" size={16} color={colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

export function TournamentGlance({
  teamsCount,
  matchesCount,
  goals,
  goalsPerMatch,
  venuesCount,
}: {
  teamsCount: number;
  matchesCount: number;
  goals: number;
  goalsPerMatch: number;
  venuesCount: number;
}) {
  const items = [
    { icon: 'people' as const, value: `${teamsCount}`, label: 'Teams', color: colors.live },
    { icon: 'map' as const, value: `${matchesCount}`, label: 'Matches', color: colors.primary },
    { icon: 'football' as const, value: `${goals}`, label: 'Goals', color: colors.ink },
    { icon: 'trending-up' as const, value: goalsPerMatch.toFixed(1), label: 'Goals/Match', color: colors.pink },
    { icon: 'ellipse' as const, value: `${venuesCount}`, label: 'Venues', color: colors.cyan },
  ];

  return (
    <View style={styles.glance}>
      <Text style={styles.glanceTitle}>TOURNAMENT AT A GLANCE</Text>
      <View style={styles.glanceItems}>
        {items.map((item) => (
          <View key={item.label} style={styles.glanceItem}>
            <Ionicons name={item.icon} size={30} color={item.color} />
            <Text style={styles.glanceValue}>{item.value}</Text>
            <Text style={styles.glanceLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.ribbonBand}>
        {['#F2054F', '#0B74E5', '#00A7D8', '#FFC400', '#0AAF48'].map((color, index) => (
          <View key={color} style={[styles.ribbon, { backgroundColor: color, transform: [{ rotate: `${index % 2 ? -8 : 8}deg` }] }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  showpieceShell: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  pitch: {
    minHeight: 256,
    padding: 16,
    overflow: 'hidden',
  },
  pitchStripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '8%',
    backgroundColor: colors.surface,
  },
  pitchTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  liveChip: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 7 },
  liveChipText: { color: colors.onPrimary, fontSize: font.size.lg, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  minuteText: { color: colors.surface, fontSize: font.size.lg, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  pitchMeta: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 },
  pitchMetaText: { color: colors.surface, fontSize: font.size.md, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  weather: { color: colors.surface, fontSize: font.size.md, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  teamBadge: { width: 84, gap: 7 },
  flagBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigFlag: { fontSize: 36 },
  teamCode: { color: colors.surface, fontSize: font.size.xl, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  scoreCenter: { alignItems: 'center', flex: 1 },
  scoreText: { color: colors.surface, fontSize: 50, lineHeight: 56, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  subScore: { color: colors.surface, fontSize: font.size.lg, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  eventsRow: { flexDirection: 'row', justifyContent: 'space-between', minHeight: 40, marginTop: 14 },
  eventsCol: { flex: 1, gap: 6 },
  eventLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventText: { color: colors.surface, fontSize: font.size.sm, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  timeline: { height: 7, borderRadius: radius.pill, backgroundColor: 'rgba(226,246,255,0.62)', marginTop: 14 },
  timelineFill: { height: 7, borderRadius: radius.pill, backgroundColor: colors.accent },
  ballMarker: { position: 'absolute', top: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  actionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1, paddingVertical: 6, borderRadius: radius.md },
  actionItemActive: { backgroundColor: colors.surfaceAlt },
  actionIconLive: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.live, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  actionDivider: { width: 1, height: 22, backgroundColor: colors.border },
  showpieceFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
  },
  showpieceVenue: { flex: 1, color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.medium as TextStyle['fontWeight'] },
  showpieceForecast: { color: colors.blue, fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  matchRow: {
    minHeight: 62,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    overflow: 'hidden',
    ...shadow.card,
  },
  rowRail: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 4, borderRadius: 3 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rowCtaText: { fontSize: font.size.sm, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  rowChevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueSoft,
  },
  rowTime: { width: 66 },
  rowStatus: { fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  rowGroup: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
  rowTeam: { width: 66, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTeamRight: { width: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  rowFlag: { fontSize: 24 },
  rowCode: { color: colors.ink, fontSize: font.size.md, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  rowScore: { flex: 1, color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.heavy as TextStyle['fontWeight'], textAlign: 'center' },
  analystCard: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
    ...shadow.card,
  },
  analystHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  analystTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analystTitle: { color: colors.pink, fontSize: font.size.lg, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  betaPill: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  betaText: { color: colors.primaryDim, fontSize: font.size.xxs, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  analystBody: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  analystBall: { fontSize: 36 },
  analystCopy: { flex: 1, color: colors.ink, fontSize: font.size.md, lineHeight: 21 },
  questions: { gap: 8 },
  questionChip: {
    borderWidth: 1,
    borderColor: '#BFD9FA',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#F8FCFF',
  },
  questionChipPressed: { backgroundColor: colors.surfaceHover },
  questionChipText: { color: colors.blue, fontSize: font.size.sm, lineHeight: 18 },
  analystThread: { maxHeight: 230 },
  analystThreadContent: { gap: 8, paddingVertical: 2 },
  analystUserBubble: {
    alignSelf: 'flex-end',
    maxWidth: '90%',
    backgroundColor: colors.pink,
    borderRadius: 13,
    borderTopRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  analystUserText: { color: colors.onPrimary, fontSize: font.size.sm, lineHeight: 19, fontWeight: font.weight.medium as TextStyle['fontWeight'] },
  analystReplyBubble: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 13,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  analystReplyError: { backgroundColor: colors.liveSoft },
  analystReplyText: { color: colors.ink, fontSize: font.size.sm, lineHeight: 20 },
  analystTyping: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 4 },
  analystTypingText: { color: colors.textMuted, fontSize: font.size.sm },
  askBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
  },
  askInput: { flex: 1, color: colors.text, fontSize: font.size.sm, paddingVertical: 6, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as never } : null) },
  askButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pink },
  glance: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#BFD9FA',
    padding: 16,
    overflow: 'hidden',
    ...shadow.card,
  },
  glanceTitle: { color: colors.blue, fontSize: font.size.md, fontWeight: font.weight.heavy as TextStyle['fontWeight'], marginBottom: 18 },
  glanceItems: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  glanceItem: { flex: 1, alignItems: 'center', gap: 4 },
  glanceValue: { color: colors.ink, fontSize: font.size.xxl, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  glanceLabel: { color: colors.text, fontSize: font.size.xs, textAlign: 'center' },
  ribbonBand: { height: 34, flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginTop: 16, marginHorizontal: -18, marginBottom: -18 },
  ribbon: { flex: 1, height: 7, borderRadius: radius.pill },
});
