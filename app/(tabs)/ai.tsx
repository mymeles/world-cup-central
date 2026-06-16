import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, shadow, space } from '../../constants/theme';
import { CentralMasthead } from '../../components/CentralMasthead';
import { backendUrl } from '../../lib/apiBase';

interface Citation {
  title?: string;
  url: string;
}

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  citations?: Citation[];
  webSearchQueries?: string[];
}

interface ChatResponse {
  text?: unknown;
  mode?: 'ai' | 'local' | 'error';
  citations?: Citation[];
  webSearchQueries?: string[];
}

const SUGGESTIONS = [
  'Compare Argentina vs France with past meetings',
  'Search latest France team news',
  'What is the fan sentiment around France today?',
  "Who plays tomorrow and what's the best match?",
  'Give me a premium Golden Boot angle',
];

const WELCOME =
  'Ask for predictions, matchup scouting, past-game context, live standings, source-backed news, or the fan mood around a team. Every answer should feel like a matchday desk: sharp, useful, and worth paying for.';

function sourceLabel(citation: Citation) {
  if (citation.title) return citation.title.replace(/\s+/g, ' ').trim();
  try {
    return new URL(citation.url).hostname.replace(/^www\./, '');
  } catch {
    return 'Source';
  }
}

function displayText(content: string) {
  return content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/\*\*/g, '')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .trim();
}

function SourceList({ citations, queries }: { citations?: Citation[]; queries?: string[] }) {
  const seenLabels = new Set<string>();
  const shown =
    citations
      ?.filter((c) => c.url)
      .filter((citation) => {
        const label = sourceLabel(citation).toLowerCase();
        if (seenLabels.has(label)) return false;
        seenLabels.add(label);
        return true;
      })
      .slice(0, 4) ?? [];
  if (!shown.length && !queries?.length) return null;

  return (
    <View style={styles.sources}>
      {shown.length ? <Text style={styles.sourcesTitle}>Sources</Text> : null}
      <View style={styles.sourceRail}>
        {shown.map((citation) => (
          <Pressable
            key={citation.url}
            style={({ pressed }) => [styles.sourceChip, pressed && { opacity: 0.75 }]}
            onPress={() => Linking.openURL(citation.url)}
            accessibilityRole="link"
            accessibilityLabel={`Open source ${sourceLabel(citation)}`}
          >
            <Ionicons name="link" size={12} color={colors.blue} />
            <Text style={styles.sourceText} numberOfLines={1}>
              {sourceLabel(citation)}
            </Text>
          </Pressable>
        ))}
      </View>
      {queries?.length ? (
        <Text style={styles.searchTrace} numberOfLines={2}>
          Search checked: {queries.join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}

export default function AIScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || loading) return;
      const userMsg: Msg = { id: `u${Date.now()}`, role: 'user', content };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput('');
      setLoading(true);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

      try {
        const res = await fetch(backendUrl('/api/ai/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
        });
        const data = (await res.json().catch(() => null)) as ChatResponse | null;
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        if (!data || typeof data.text !== 'string') throw new Error('The AI route returned an unexpected response.');
        const answer = data.text;
        setMessages((prev) => [
          ...prev,
          {
            id: `a${Date.now()}`,
            role: 'assistant',
            content: answer,
            isError: data.mode === 'error',
            citations: Array.isArray(data.citations) ? data.citations : [],
            webSearchQueries: Array.isArray(data.webSearchQueries) ? data.webSearchQueries : [],
          },
        ]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Please check your connection and try again.';
        setMessages((prev) => [
          ...prev,
          { id: `a${Date.now()}`, role: 'assistant', content: `I had trouble connecting. ${message}`, isError: true },
        ]);
      } finally {
        setLoading(false);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      }
    },
    [messages, loading],
  );

  const empty = messages.length === 0;

  return (
    <View style={styles.container}>
      <KeyboardAvoider bottomOffset={Math.max(insets.bottom, space.md)}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (!empty || loading) scrollRef.current?.scrollToEnd({ animated: true });
          }}
        >
          <CentralMasthead compact />

          <View style={styles.content}>
            <LinearGradient colors={['#FFFFFF', '#EAF7FF']} style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.heroTitleIcon}>
                  <Ionicons name="sparkles" size={21} color={colors.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kicker}>AI ANALYST</Text>
                  <Text style={styles.title}>Premium football answers, grounded in real context</Text>
                </View>
              </View>
              <Text style={styles.heroCopy}>{WELCOME}</Text>
            </LinearGradient>

            {empty ? (
              <View style={styles.promptPanel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Start with a serious analyst prompt</Text>
                  <View style={styles.proPill}>
                    <Ionicons name="flash" size={12} color={colors.pink} />
                    <Text style={styles.proPillText}>Pro</Text>
                  </View>
                </View>
                <View style={styles.suggestions}>
                  {SUGGESTIONS.map((s, index) => (
                    <Pressable
                      key={s}
                      style={({ pressed }) => [
                        styles.suggestion,
                        { borderLeftColor: [colors.pink, colors.blue, colors.primary, colors.accent, colors.cyan][index] },
                        pressed && styles.suggestionPressed,
                      ]}
                      onPress={() => send(s)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ask AI analyst: ${s}`}
                    >
                      <Text style={styles.suggestionText}>{s}</Text>
                      <Ionicons name="arrow-forward" size={16} color={colors.blue} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.thread}>
              {messages.map((m) =>
                m.role === 'user' ? (
                  <View key={m.id} style={styles.userBubble} accessibilityRole="text">
                    <Text style={styles.userText}>{m.content}</Text>
                  </View>
                ) : (
                  <View key={m.id} style={[styles.assistantBubble, m.isError && styles.errorBubble]} accessibilityRole="text">
                    <Text style={styles.assistantName}>World Cup Analyst</Text>
                    <Text style={styles.assistantText}>{displayText(m.content)}</Text>
                    <SourceList citations={m.citations} queries={m.webSearchQueries} />
                  </View>
                ),
              )}

              {loading ? (
                <View style={[styles.assistantBubble, styles.typing]} accessibilityRole="text">
                  <ActivityIndicator color={colors.pink} size="small" />
                  <Text style={styles.typingText}>Checking the database and web context...</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask for a prediction, past reference, or latest team news..."
            placeholderTextColor={colors.textFaint}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            multiline
            accessibilityLabel="Ask the World Cup AI analyst"
          />
          <Pressable
            style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.8 }, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            accessibilityRole="button"
            accessibilityLabel="Send message to AI analyst"
            accessibilityState={{ disabled: !input.trim() || loading }}
          >
            <Ionicons name="paper-plane" size={18} color={colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoider>
    </View>
  );
}

function KeyboardAvoider({ children, bottomOffset }: { children: React.ReactNode; bottomOffset: number }) {
  if (Platform.OS !== 'ios') return <View style={{ flex: 1 }}>{children}</View>;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={90 + bottomOffset}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 112 },
  content: {
    width: '100%',
    maxWidth: 1060,
    alignSelf: 'center',
    padding: space.lg,
    gap: space.lg,
  },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
    ...shadow.card,
  },
  heroTop: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  heroTitleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    color: colors.pink,
    fontSize: font.size.xs,
    fontWeight: font.weight.heavy as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  title: {
    color: colors.ink,
    fontSize: font.size.xxl,
    lineHeight: 28,
    fontWeight: font.weight.heavy as TextStyle['fontWeight'],
    marginTop: 2,
  },
  heroCopy: { color: colors.textMuted, fontSize: font.size.md, lineHeight: 21 },
  promptPanel: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
    ...shadow.card,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  panelTitle: { flex: 1, color: colors.ink, fontSize: font.size.lg, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  proPill: { flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: radius.pill, backgroundColor: colors.pinkSoft, paddingHorizontal: 9, paddingVertical: 5 },
  proPillText: { color: colors.pink, fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  suggestions: { gap: space.sm },
  suggestion: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  suggestionPressed: { backgroundColor: colors.surfaceHover },
  suggestionText: { flex: 1, color: colors.ink, fontSize: font.size.sm, lineHeight: 18, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  thread: { gap: space.md },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    borderTopLeftRadius: 6,
    padding: space.md,
    alignSelf: 'flex-start',
    maxWidth: '94%',
    gap: space.sm,
    ...shadow.card,
  },
  errorBubble: { borderColor: colors.live, backgroundColor: colors.liveSoft },
  assistantName: { color: colors.pink, fontSize: font.size.sm, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  assistantText: { color: colors.text, fontSize: font.size.md, lineHeight: 22 },
  userBubble: {
    backgroundColor: colors.blue,
    borderRadius: 17,
    borderTopRightRadius: 6,
    padding: space.md,
    alignSelf: 'flex-end',
    maxWidth: '88%',
  },
  userText: { color: colors.onPrimary, fontSize: font.size.md, lineHeight: 22, fontWeight: font.weight.medium as TextStyle['fontWeight'] },
  typing: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  typingText: { color: colors.textMuted, fontSize: font.size.sm },
  sources: { gap: 7, marginTop: 2 },
  sourcesTitle: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.heavy as TextStyle['fontWeight'] },
  sourceRail: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  sourceChip: {
    maxWidth: 230,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#BFD9FA',
    backgroundColor: '#F8FCFF',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  sourceText: { color: colors.blue, fontSize: font.size.xs, fontWeight: font.weight.bold as TextStyle['fontWeight'] },
  searchTrace: { color: colors.textFaint, fontSize: font.size.xxs, lineHeight: 15 },
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    maxHeight: 118,
    minHeight: 46,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 17,
    paddingHorizontal: space.lg,
    paddingTop: 12,
    paddingBottom: 12,
    color: colors.text,
    fontSize: font.size.md,
    lineHeight: 20,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
});
