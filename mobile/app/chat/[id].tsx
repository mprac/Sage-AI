/** Streaming chat with the personal chef — modern messenger UI: chef-avatar bubbles, a unified
 *  composer (quick actions + input), typing indicator, markdown replies, resume + recipe/feed. */
import { useHeaderHeight } from '@react-navigation/elements';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gradient, Icon, type IconName, Input, Markdown, Text } from '../../src/components/ui';
import { useChatStream } from '../../src/features/chat/useChatStream';
import { useChatMessages } from '../../src/features/chat/useChats';
import { useGenerateRecipe } from '../../src/features/recipes/useRecipes';
import { useSage } from '../../src/features/sage/useSage';
import { ApiError } from '../../src/lib/api';
import { haptic } from '../../src/lib/haptics';
import { useRecipeDraft } from '../../src/store/recipe';
import { useTheme } from '../../src/theme';

// Guiding questions that rotate in the composer placeholder to coach the user toward the right meal.
const HINTS = [
  'How many people are you cooking for?',
  'How much time do you want to spend cooking?',
  'What are you craving tonight?',
  'Any ingredients you want to use up?',
  'Want something quick, healthy, or comforting?',
  'Dietary needs — vegetarian, high-protein, none?',
];

// ── Gradient "AI" orb that marks Sage's messages ──
function Orb({ size = 30 }: { size?: number }) {
  return (
    <Gradient
      name="brand"
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name="sparkles" tone="onPrimary" size="sm" />
    </Gradient>
  );
}

/**
 * Temporarily balance unclosed markdown markers during live streaming so text renders FORMATTED
 * as it flows (no stray `**`/`` ` `` flashing before the closer arrives).
 */
function balanceMarkdown(t: string): string {
  let s = t;
  if (((s.match(/\*\*/g) || []).length) % 2 === 1) s += '**';
  if (((s.match(/`/g) || []).length) % 2 === 1) s += '`';
  return s;
}

// ── Rotating "cooking" status while Sage thinks — playful, clearly AI (not bare dots) ──
const COOKING_WORDS = ['Cooking', 'Frying', 'Baking', 'Simmering', 'Sautéing', 'Plating', 'Seasoning', 'Creating'];

function CookingStatus() {
  const theme = useTheme();
  const [wordIdx, setWordIdx] = useState(0);
  const [dotCount, setDotCount] = useState(1);
  const fade = useRef(new Animated.Value(1)).current;

  // Cycle the cooking word every ~1.1s with a gentle cross-fade.
  useEffect(() => {
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      // swap the word at the dim midpoint
      setTimeout(() => setWordIdx((i) => (i + 1) % COOKING_WORDS.length), 180);
    }, 1100);
    return () => clearInterval(id);
  }, [fade]);

  // Animate the trailing ellipsis (. .. ...).
  useEffect(() => {
    const id = setInterval(() => setDotCount((c) => (c % 3) + 1), 400);
    return () => clearInterval(id);
  }, []);

  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, opacity: fade }}>
      <Icon name="flame" tone="primary" size="sm" />
      <Text tone="muted">
        {COOKING_WORDS[wordIdx]}
        {'.'.repeat(dotCount)}
      </Text>
    </Animated.View>
  );
}

function Bubble({
  role,
  content,
  live,
  name,
}: {
  role: 'user' | 'assistant';
  content: string;
  live?: boolean;
  name: string;
}) {
  const theme = useTheme();

  // User: a soft, right-aligned pill — quiet, not a heavy chat bubble.
  if (role === 'user') {
    return (
      <View style={{ alignItems: 'flex-end', marginBottom: theme.spacing.lg }}>
        <View
          style={{
            maxWidth: '82%',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderTopRightRadius: 6,
            paddingVertical: theme.spacing.sm + 2,
            paddingHorizontal: theme.spacing.md,
          }}
        >
          <Text>{content}</Text>
        </View>
      </View>
    );
  }

  // Assistant: a soft, floating "chef's note" — faint sage→white wash, layered shadow, no hard
  // border. The orb sits at the bubble's top-left with a gentle glow, so the reply reads as
  // coming from Sage himself.
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
      <View style={[{ borderRadius: 999 }, theme.shadow.glow]}>
        <Orb size={34} />
      </View>
      {/* Outer view carries the float shadow; the inner clipped gradient carries the wash. */}
      <View
        style={[
          {
            flexShrink: 1,
            maxWidth: '84%',
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderTopLeftRadius: theme.radius.sm,
          },
          theme.shadow.card,
        ]}
      >
        <Gradient
          name="bubble"
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            borderRadius: theme.radius.lg,
            borderTopLeftRadius: theme.radius.sm,
            paddingVertical: theme.spacing.sm + 4,
            paddingHorizontal: theme.spacing.md,
            overflow: 'hidden',
          }}
        >
          {!content ? (
            <CookingStatus />
          ) : (
            // Render markdown LIVE (balanced) so text appears already formatted as it streams.
            <Markdown>{live ? balanceMarkdown(content) : content}</Markdown>
          )}
        </Gradient>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { id, resume } = useLocalSearchParams<{ id: string; resume?: string }>();
  const isResume = resume === '1';
  const recognitionId = isResume ? null : id;

  const chefName = useSage().data?.name ?? 'Sage';
  const loaded = useChatMessages(isResume ? id : null);
  const initialMessages = useMemo(() => loaded.data ?? [], [loaded.data]);

  const { messages, streaming, error, send, sessionId: streamSession } = useChatStream(
    initialMessages,
    isResume ? id : null,
  );
  const { feed } = useSage();
  const generateRecipe = useGenerateRecipe();
  const setDraft = useRecipeDraft((s) => s.setDraft);
  const [draftText, setDraftText] = useState('');
  const [focused, setFocused] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const started = useRef(false);

  // Rotate the guiding placeholder while the input is empty and idle (paused on focus / typing).
  useEffect(() => {
    if (focused || draftText) return;
    const id = setInterval(() => setHintIdx((i) => (i + 1) % HINTS.length), 3500);
    return () => clearInterval(id);
  }, [focused, draftText]);

  useEffect(() => {
    if (isResume || started.current) return;
    started.current = true;
    send({ message: 'What can I make with these ingredients?', sessionId: null, recognitionId });
  }, [isResume, recognitionId, send]);

  // Stay pinned to the bottom only when the user is already there, so reading earlier text isn't
  // yanked. The actual scroll happens in the ScrollView's onContentSizeChange (after layout is
  // measured) — scrolling here on every reveal tick fires before re-layout and causes the bounce.
  const atBottom = useRef(true);
  const followBottom = () => {
    if (atBottom.current) scrollRef.current?.scrollToEnd({ animated: false });
  };

  function submit() {
    const text = draftText.trim();
    if (!text || streaming) return;
    setDraftText('');
    send({ message: text, sessionId: streamSession.current });
  }

  function markCooked() {
    haptic.success();
    feed.mutate('cook', {
      onSuccess: (res) => {
        const lines = [`Yum! ${chefName} is full and happy.`];
        if (res.revived) lines.push(`You brought ${chefName} back to life!`);
        if (res.leveled_up) lines.push(`${chefName} leveled up to ${res.pet.level}!`);
        Alert.alert(`Fed ${chefName}`, lines.join('\n'));
      },
    });
  }

  function getRecipe() {
    generateRecipe.mutate(
      { session_id: streamSession.current, recognition_id: recognitionId },
      {
        onSuccess: (res) => {
          setDraft(res.recipe);
          router.push('/recipe/new');
        },
        onError: (e) => {
          if (e instanceof ApiError && e.status === 402) {
            Alert.alert('Out of credits', 'Top up to get full recipes.', [
              { text: 'Not now' },
              { text: 'Get credits', onPress: () => router.push('/wallet') },
            ]);
          } else {
            Alert.alert('Hmm', "Couldn't build that recipe. Try again.");
          }
        },
      },
    );
  }

  const canSend = !!draftText.trim() && !streaming;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: chefName }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.md }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          // Follow the growing reply only after layout settles → smooth, no per-tick bounce.
          onContentSizeChange={followBottom}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            atBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
          }}
        >
          {messages.map((m, i) => (
            <Bubble
              key={i}
              role={m.role}
              content={m.content}
              name={chefName}
              live={streaming && i === messages.length - 1 && m.role === 'assistant'}
            />
          ))}
          {error ? (
            <Text tone="danger" variant="caption" style={{ textAlign: 'center' }}>{error}</Text>
          ) : null}
        </ScrollView>

        {/* Unified composer: quick actions + input live on one surface */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.sm,
            paddingBottom: Math.max(theme.spacing.sm, insets.bottom),
            gap: theme.spacing.sm,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.sm }}
            keyboardShouldPersistTaps="handled"
          >
            <QuickAction icon="utensils" label="I cooked this" onPress={markCooked} disabled={feed.isPending} />
            <QuickAction
              icon="book-open"
              label={generateRecipe.isPending ? 'Cooking up…' : 'Get full recipe'}
              onPress={getRecipe}
              disabled={generateRecipe.isPending || streaming}
            />
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                minHeight: 54,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.xl,
                borderWidth: 1,
                borderColor: focused ? theme.colors.primary : theme.colors.border,
                paddingHorizontal: theme.spacing.sm + 2,
                paddingVertical: 6,
                maxHeight: 130,
              }}
            >
              {/* AI affordance — a gradient sparkles orb at the head of the input. */}
              <Orb size={28} />
              <View style={{ flex: 1 }}>
                <Input
                  placeholder={focused || draftText ? `Message ${chefName}…` : HINTS[hintIdx]}
                  value={draftText}
                  onChangeText={setDraftText}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onSubmitEditing={submit}
                  returnKeyType="send"
                  editable={!streaming}
                  multiline
                  style={{
                    fontSize: 16,
                    lineHeight: 21,
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                    padding: 0,
                    paddingVertical: 0,
                    textAlignVertical: 'center',
                  }}
                />
              </View>
            </View>
            <Pressable
              onPress={submit}
              disabled={!canSend}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: canSend ? theme.colors.primary : theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="send" tone={canSend ? 'onPrimary' : 'subtle'} size="md" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        paddingVertical: theme.spacing.xs + 2,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Icon name={icon} tone="primary" size="sm" />
      <Text variant="caption" tone="text">{label}</Text>
    </Pressable>
  );
}
