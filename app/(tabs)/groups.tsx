import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, shadow, space } from '../../constants/theme';
import { CentralMasthead } from '../../components/CentralMasthead';
import { DashboardMatchRow } from '../../components/WorldCupDashboard';
import { useMatches, useTeams } from '../../lib/hooks';
import { GROUPS } from '../../data/worldcup';
import { dayKey, dayLabel, todayKey } from '../../lib/format';
import { getMatchDisplayState } from '../../lib/matchStatus';
import type { Match } from '../../types';

type PhaseFilter = 'all' | 'past' | 'today' | 'future' | 'live';

const ET = 'America/New_York';
const DATE_LONG = new Intl.DateTimeFormat('en-US', { timeZone: ET, weekday: 'long', month: 'long', day: 'numeric' });
const DATE_CHIP_DAY = new Intl.DateTimeFormat('en-US', { timeZone: ET, weekday: 'short' });
const DATE_CHIP_DATE = new Intl.DateTimeFormat('en-US', { timeZone: ET, month: 'short', day: 'numeric' });

const PHASES: { key: PhaseFilter; label: string; caption: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'all', label: 'All', caption: 'Full slate', icon: 'apps', color: colors.ink },
  { key: 'past', label: 'Past', caption: 'Results', icon: 'checkmark-done', color: colors.primary },
  { key: 'today', label: 'Today', caption: 'Present', icon: 'football', color: colors.live },
  { key: 'future', label: 'Future', caption: 'Upcoming', icon: 'time', color: colors.blue },
  { key: 'live', label: 'Live', caption: 'Now', icon: 'radio', color: colors.live },
];

function compareDateKey(key: string, today: string) {
  if (key < today) return 'past';
  if (key === today) return 'today';
  return 'future';
}

function phaseMatches(match: Match, phase: PhaseFilter, today: string) {
  if (phase === 'all') return true;
  if (phase === 'live') return getMatchDisplayState(match) === 'live';
  return compareDateKey(dayKey(match.kickoff), today) === phase;
}

function makeSections(matches: Match[]) {
  const map = new Map<string, Match[]>();
  for (const match of matches) {
    const key = dayKey(match.kickoff);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(match);
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, data]) => ({
      key,
      label: dayLabel(data[0].kickoff),
      sublabel: DATE_LONG.format(new Date(data[0].kickoff)),
      data,
    }));
}

function gamesLabel(count: number) {
  return `${count} ${count === 1 ? 'game' : 'games'}`;
}

function SummaryStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

export default function MatchesScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const { data: matches, isLoading } = useMatches();
  const { data: teams } = useTeams();
  const [phase, setPhase] = useState<PhaseFilter>('today');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const allMatches = matches ?? [];
  const today = todayKey();

  const counts = useMemo(() => {
    const base = selectedGroup ? allMatches.filter((match) => match.group === selectedGroup) : allMatches;
    return {
      all: base.length,
      past: base.filter((match) => compareDateKey(dayKey(match.kickoff), today) === 'past').length,
      today: base.filter((match) => compareDateKey(dayKey(match.kickoff), today) === 'today').length,
      future: base.filter((match) => compareDateKey(dayKey(match.kickoff), today) === 'future').length,
      live: base.filter((match) => getMatchDisplayState(match) === 'live').length,
    };
  }, [allMatches, selectedGroup, today]);

  const dateOptions = useMemo(() => {
    const map = new Map<string, { iso: string; count: number }>();
    for (const match of allMatches) {
      if (selectedGroup && match.group !== selectedGroup) continue;
      if (!phaseMatches(match, phase, today)) continue;
      const key = dayKey(match.kickoff);
      const existing = map.get(key);
      map.set(key, { iso: existing?.iso ?? match.kickoff, count: (existing?.count ?? 0) + 1 });
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({ key, ...value }));
  }, [allMatches, phase, selectedGroup, today]);

  const filtered = useMemo(
    () =>
      allMatches
        .filter((match) => (selectedGroup ? match.group === selectedGroup : true))
        .filter((match) => phaseMatches(match, phase, today))
        .filter((match) => (selectedDate ? dayKey(match.kickoff) === selectedDate : true))
        .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff)),
    [allMatches, phase, selectedDate, selectedGroup, today],
  );

  const sections = useMemo(() => makeSections(filtered), [filtered]);
  const activePhase = PHASES.find((item) => item.key === phase) ?? PHASES[0];

  const setPhaseAndResetDate = (next: PhaseFilter) => {
    setPhase(next);
    setSelectedDate(null);
  };

  const setGroupAndResetDate = (next: string | null) => {
    setSelectedGroup(next);
    setSelectedDate(null);
  };

  const clearFilters = () => {
    setPhase('all');
    setSelectedDate(null);
    setSelectedGroup(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <CentralMasthead compact />

        <View style={styles.content}>
          <View style={styles.controlCard}>
            <View style={styles.controlHeader}>
              <View>
                <Text style={styles.kicker}>MATCH CENTER</Text>
                <Text style={styles.title}>Choose any date, group, or phase</Text>
              </View>
              <View style={[styles.phaseBadge, { backgroundColor: `${activePhase.color}18` }]}>
                <Ionicons name={activePhase.icon} size={15} color={activePhase.color} />
                <Text style={[styles.phaseBadgeText, { color: activePhase.color }]}>{activePhase.label}</Text>
              </View>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryStat label="Past" value={counts.past} color={colors.primary} />
              <SummaryStat label="Today" value={counts.today} color={colors.live} />
              <SummaryStat label="Future" value={counts.future} color={colors.blue} />
              <SummaryStat label="Live" value={counts.live} color={colors.pink} />
            </View>

            <View style={styles.filterBlock}>
              <Text style={styles.filterLabel}>Phase</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phaseRail}>
                {PHASES.map((item) => {
                  const active = item.key === phase;
                  return (
                    <Pressable
                      key={item.key}
                      style={[styles.phaseChip, active && { backgroundColor: item.color, borderColor: item.color }]}
                      onPress={() => setPhaseAndResetDate(item.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Ionicons name={item.icon} size={16} color={active ? colors.onPrimary : item.color} />
                      <View>
                        <Text style={[styles.phaseText, active && styles.phaseTextActive]}>{item.label}</Text>
                        <Text style={[styles.phaseCaption, active && styles.phaseTextActive]}>{item.caption}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.filterBlock}>
              <Text style={styles.filterLabel}>Dates</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRail}>
                <Pressable
                  style={[styles.dateChip, selectedDate === null && styles.dateChipActive]}
                  onPress={() => setSelectedDate(null)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedDate === null }}
                >
                  <Ionicons name="calendar" size={17} color={selectedDate === null ? colors.onPrimary : colors.blue} />
                  <Text style={[styles.dateAllText, selectedDate === null && styles.dateActiveText]}>All dates</Text>
                </Pressable>
                {dateOptions.map((item) => {
                  const active = selectedDate === item.key;
                  const isToday = item.key === today;
                  return (
                    <Pressable
                      key={item.key}
                      style={[styles.dateChip, styles.dateChipTall, active && styles.dateChipActive, !active && isToday && styles.dateChipToday]}
                      onPress={() => setSelectedDate(active ? null : item.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.dateTop, active && styles.dateActiveText, !active && isToday && { color: colors.live }]}>
                        {isToday ? 'Today' : DATE_CHIP_DAY.format(new Date(item.iso))}
                      </Text>
                      <Text style={[styles.dateBottom, active && styles.dateActiveText]}>{DATE_CHIP_DATE.format(new Date(item.iso))}</Text>
                      <Text style={[styles.dateCount, active && styles.dateActiveText]}>{gamesLabel(item.count)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.filterBlock}>
              <Text style={styles.filterLabel}>Groups</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRail}>
                <Pressable
                  style={[styles.groupChip, selectedGroup === null && styles.groupChipActive]}
                  onPress={() => setGroupAndResetDate(null)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedGroup === null }}
                >
                  <Text style={[styles.groupText, selectedGroup === null && styles.groupTextActive]}>All</Text>
                </Pressable>
                {GROUPS.map((group) => {
                  const active = selectedGroup === group;
                  return (
                    <Pressable
                      key={group}
                      style={[styles.groupChip, active && styles.groupChipActive]}
                      onPress={() => setGroupAndResetDate(active ? null : group)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.groupText, active && styles.groupTextActive]}>{group}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.resultTitle}>Schedule</Text>
              <Text style={styles.resultSub}>
                {filtered.length} {filtered.length === 1 ? 'match' : 'matches'}
                {selectedGroup ? ` · Group ${selectedGroup}` : ''}
                {selectedDate ? ` · ${DATE_CHIP_DATE.format(new Date(dateOptions.find((d) => d.key === selectedDate)?.iso ?? new Date()))}` : ''}
              </Text>
            </View>
            {(phase !== 'all' || selectedDate || selectedGroup) && (
              <Pressable style={styles.clearBtn} onPress={clearFilters} accessibilityRole="button">
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>

          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : sections.length ? (
            <View style={[styles.sections, isWide && styles.sectionsWide]}>
              {sections.map((section) => (
                <View key={section.key} style={styles.daySection}>
                  <View style={styles.dayHead}>
                    <View style={styles.dayMark} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayTitle}>{section.label}</Text>
                      <Text style={styles.daySub}>{section.sublabel}</Text>
                    </View>
                    <View style={styles.dayPill}>
                      <Text style={styles.dayPillText}>{gamesLabel(section.data.length)}</Text>
                    </View>
                  </View>
                  <View style={styles.matchList}>
                    {section.data.map((match) => (
                      <DashboardMatchRow key={match.id} match={match} teams={teams} isWide={isWide} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="search" size={28} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>No matches for this view</Text>
              <Text style={styles.emptyBody}>Try another date, phase, or group.</Text>
              <Pressable style={styles.emptyBtn} onPress={clearFilters} accessibilityRole="button">
                <Text style={styles.emptyBtnText}>Show full schedule</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  page: { paddingBottom: 96 },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    padding: space.lg,
    gap: space.xl,
  },
  controlCard: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.lg,
    ...shadow.card,
  },
  controlHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md },
  kicker: {
    color: colors.live,
    fontSize: font.size.xs,
    fontWeight: font.weight.heavy as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  title: {
    color: colors.ink,
    fontSize: font.size.xxl,
    lineHeight: 27,
    fontWeight: font.weight.heavy as TextStyle['fontWeight'],
    marginTop: 2,
  },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  phaseBadgeText: { fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  summaryGrid: { flexDirection: 'row', gap: space.sm },
  summaryStat: {
    flex: 1,
    minHeight: 68,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  summaryValue: { fontSize: font.size.xxl, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  summaryLabel: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.semibold as TextStyle['fontWeight'] },
  filterBlock: { gap: space.sm },
  filterLabel: { color: colors.ink, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  phaseRail: { gap: space.sm, paddingRight: space.lg },
  phaseChip: {
    minWidth: 116,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
  },
  phaseText: { color: colors.ink, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  phaseCaption: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 1 },
  phaseTextActive: { color: colors.onPrimary },
  dateRail: { gap: space.sm, paddingRight: space.lg },
  dateChip: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  dateChipTall: { minWidth: 86, flexDirection: 'column', justifyContent: 'center', gap: 0, paddingHorizontal: 12 },
  dateChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  dateChipToday: { borderColor: colors.live, backgroundColor: colors.liveSoft },
  dateAllText: { color: colors.blue, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  dateTop: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  dateBottom: { color: colors.ink, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  dateCount: { color: colors.textFaint, fontSize: font.size.xxs, marginTop: 1 },
  dateActiveText: { color: colors.onPrimary },
  groupRail: { gap: space.sm, paddingRight: space.lg },
  groupChip: {
    minWidth: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupText: { color: colors.textMuted, fontSize: font.size.md, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  groupTextActive: { color: colors.onPrimary },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultTitle: { color: colors.ink, fontSize: font.size.xl, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  resultSub: { color: colors.textMuted, fontSize: font.size.sm, marginTop: 2 },
  clearBtn: { borderRadius: radius.pill, backgroundColor: colors.pinkSoft, paddingHorizontal: 14, paddingVertical: 8 },
  clearText: { color: colors.pink, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  loading: { paddingVertical: space.xxxl, alignItems: 'center' },
  sections: { gap: space.xl },
  sectionsWide: { gap: space.lg },
  daySection: { gap: space.sm },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dayMark: { width: 5, height: 34, borderRadius: 3, backgroundColor: colors.live },
  dayTitle: { color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  daySub: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 1 },
  dayPill: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  dayPillText: { color: colors.primaryDim, fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  matchList: { gap: 8 },
  empty: {
    minHeight: 260,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    gap: space.sm,
    ...shadow.card,
  },
  emptyTitle: { color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  emptyBody: { color: colors.textMuted, fontSize: font.size.sm, textAlign: 'center' },
  emptyBtn: { marginTop: space.sm, borderRadius: radius.pill, backgroundColor: colors.primary, paddingHorizontal: space.lg, paddingVertical: space.sm },
  emptyBtnText: { color: colors.onPrimary, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
});
