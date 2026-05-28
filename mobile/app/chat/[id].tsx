/** Streaming chat with the personal chef — modern messenger UI: chef-avatar bubbles, a unified
 *  composer (quick actions + input), typing indicator, markdown replies, resume + recipe/feed. */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  type TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInUp, Gradient, Icon, type IconName, Input, Markdown, ShineOverlay, Text } from '../../src/components/ui';
import { useChatStream } from '../../src/features/chat/useChatStream';
import { useChatMessages } from '../../src/features/chat/useChats';
import { useProfile } from '../../src/features/profile/useProfile';
import { useGenerateRecipe, useSaveRecipe } from '../../src/features/recipes/useRecipes';
import { useSage } from '../../src/features/sage/useSage';
import { ApiError } from '../../src/lib/api';
import { haptic } from '../../src/lib/haptics';
import { useRecipeDraft } from '../../src/store/recipe';
import { useTheme } from '../../src/theme';
import type { TasteProfile } from '../../src/types/api';

/** Whole-message affirmative ("yes", "sure", "ok please") — used only when the chef has actively
 *  offered the recipe, to accept it. Conservative on purpose: longer messages go to chat as normal. */
function isAffirmative(text: string): boolean {
  return /^(y(es|eah|ep|up)?|sure|ok(ay)?|please|yes please|go ahead|do it|sounds good|let'?s( do it)?|absolutely|definitely)\b[\s.!]*$/i.test(
    text.trim(),
  );
}

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

// ── Rotating "cooking" status while Sage thinks — playful, clearly AI (not bare dots) ──
const COOKING_WORDS = ['Cooking', 'Frying', 'Baking', 'Simmering', 'Sautéing', 'Plating', 'Seasoning', 'Creating'];

function CookingStatus() {
  const theme = useTheme();
  const [wordIdx, setWordIdx] = useState(0);
  const [dotCount, setDotCount] = useState(1);
  const fade = useRef(new Animated.Value(1)).current;

  // Cycle the cooking word every ~2.2s with a gentle cross-fade — slow enough to enjoy reading each.
  useEffect(() => {
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      // swap the word at the dim midpoint
      setTimeout(() => setWordIdx((i) => (i + 1) % COOKING_WORDS.length), 180);
    }, 2200);
    return () => clearInterval(id);
  }, [fade]);

  // Animate the trailing ellipsis (. .. ...).
  useEffect(() => {
    const id = setInterval(() => setDotCount((c) => (c % 3) + 1), 400);
    return () => clearInterval(id);
  }, []);

  return (
    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, opacity: fade }}>
      <Icon name="flame" color={theme.colors.energy} size="sm" />
      <Text tone="muted">
        {COOKING_WORDS[wordIdx]}
        {'.'.repeat(dotCount)}
      </Text>
    </Animated.View>
  );
}

const Bubble = React.memo(function Bubble({
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
            // Markdown rendering throughout — including during the stream. The Markdown
            // component strips trailing unclosed `**`/`` ` ``/```` ``` ```` so users never see
            // raw markers; closed spans render correctly the moment the closer arrives.
            <Markdown spacious>{content}</Markdown>
          )}
        </Gradient>
      </View>
    </View>
  );
});

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, resume, fresh, tweak } = useLocalSearchParams<{
    id: string;
    resume?: string;
    fresh?: string;
    tweak?: string;
  }>();
  // A saved recipe the user came back to adjust (via "Tweak in chat"). Threaded into every send so
  // the backend injects the full recipe into Sage's context — even in the fresh-chat fallback where
  // the recipe isn't linked to this session.
  const tweakId = typeof tweak === 'string' && tweak ? tweak : null;
  const isResume = resume === '1';
  // A "fresh" chat (started from the Chats tab, only after the first photo-chat exists) has no
  // photo behind it: no recognition and no auto-sent opener — the user types the first message.
  const isFresh = fresh === '1';
  const recognitionId = isResume || isFresh ? null : id;

  const chefName = useSage().data?.name ?? 'Sage';
  const loaded = useChatMessages(isResume ? id : null);
  const initialMessages = useMemo(() => loaded.data ?? [], [loaded.data]);

  const { messages, streaming, error, send, sessionId: streamSession, offerRecipe } = useChatStream(
    initialMessages,
    isResume ? id : null,
  );
  const { feed } = useSage();
  const { data: profile } = useProfile();
  const generateRecipe = useGenerateRecipe();
  const saveRecipe = useSaveRecipe();
  const setDraft = useRecipeDraft((s) => s.setDraft);
  const [draftText, setDraftText] = useState('');
  const [focused, setFocused] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const started = useRef(false);

  // A refiner chip drops an editable phrase into the composer and keeps the keyboard up, so the
  // user can stack constraints ("…for 4 people. …only 15 minutes.") and tweak before sending.
  function appendChip(phrase: string) {
    haptic.light();
    setDraftText((prev) => {
      const base = prev.trim();
      return base ? `${base} ${phrase}` : phrase;
    });
    inputRef.current?.focus();
  }

  // Rotate the guiding placeholder while the input is empty and idle (paused on focus / typing).
  useEffect(() => {
    if (focused || draftText) return;
    const id = setInterval(() => setHintIdx((i) => (i + 1) % HINTS.length), 3500);
    return () => clearInterval(id);
  }, [focused, draftText]);

  useEffect(() => {
    // Resume + fresh chats don't auto-send: resume loads history, fresh waits for the user's first line.
    if (isResume || isFresh || started.current) return;
    started.current = true;
    send({ message: 'What can I make with these ingredients?', sessionId: null, recognitionId });
  }, [isResume, isFresh, recognitionId, send]);

  // Coming back to tweak a saved recipe: seed the composer (editable — never auto-sent, so the user
  // stays in control) and pop the keyboard so they can finish the sentence with their change.
  useEffect(() => {
    if (!tweakId) return;
    setDraftText((prev) => prev || "Let's tweak this recipe — ");
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [tweakId]);

  // Stay pinned to the bottom only when the user is already there, so reading earlier text isn't
  // yanked. The actual scroll happens in the ScrollView's onContentSizeChange (after layout is
  // measured) — scrolling here on every reveal tick fires before re-layout and causes the bounce.
  const atBottom = useRef(true);
  const followBottom = () => {
    if (atBottom.current) scrollRef.current?.scrollToEnd({ animated: false });
  };

  // Smooth keyboard avoidance. RN's KeyboardAvoidingView jolts because it measures a frame late;
  // instead we drive the lift ourselves from the keyboard's OWN animation (duration + curve), so
  // the composer glides perfectly in sync. iOS only — Android relies on native window resize
  // (adjustResize), which is already smooth and would double up with a manual lift.
  const kbLift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const onShow = (e: { endCoordinates: { height: number }; duration?: number }) => {
      Animated.timing(kbLift, {
        toValue: Math.max(0, e.endCoordinates.height - insets.bottom),
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
      requestAnimationFrame(() => {
        if (atBottom.current) scrollRef.current?.scrollToEnd({ animated: true });
      });
    };
    const onHide = (e: { duration?: number }) => {
      Animated.timing(kbLift, { toValue: 0, duration: e.duration || 250, useNativeDriver: false }).start();
    };
    const show = Keyboard.addListener('keyboardWillShow', onShow);
    const hide = Keyboard.addListener('keyboardWillHide', onHide);
    return () => {
      show.remove();
      hide.remove();
    };
  }, [kbLift, insets.bottom]);

  function submit() {
    const text = draftText.trim();
    if (!text || streaming) return;
    // If the chef just offered the full recipe and the user accepts, run the structured generator
    // instead of streaming a reply. Gated on the server-set `offerRecipe` flag, so it can never
    // fire off an unrelated yes/no question or when no recipe was offered.
    if (offerRecipe && isAffirmative(text)) {
      setDraftText('');
      getRecipe();
      return;
    }
    setDraftText('');
    send({ message: text, sessionId: streamSession.current, recipeId: tweakId });
  }

  function markCooked() {
    haptic.success();
    feed.mutate({ source: 'cook' }, {
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
          // Auto-save: every generated recipe lands directly in the cookbook — no extra tap to
          // confirm. The chat that produced it is stamped so "Tweak in chat" can reopen it later.
          const withSession = { ...res.recipe, session_id: streamSession.current };
          saveRecipe.mutate(withSession, {
            onSuccess: ({ id }) => router.push(`/recipe/${id}`),
            onError: () => {
              // Save failed — fall back to the ephemeral draft so the user can still cook from
              // the recipe and try saving manually from the detail screen.
              setDraft(withSession);
              router.push('/recipe/new');
            },
          });
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

  // Stable header options — recomputed only when the chef name / theme changes, so the rapid
  // streaming re-renders never churn (or flicker) the nav header.
  const headerOptions = useMemo(
    () => ({
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: theme.colors.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chef-hat" tone="primary" size="sm" />
          </View>
          <Text variant="title">{chefName}</Text>
        </View>
      ),
    }),
    [chefName, theme],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={headerOptions} />
      {/* iOS: paddingBottom animates in lock-step with the keyboard (see kbLift). Android: this is
          0 and the native window resize moves the bottom-anchored composer up. */}
      <Animated.View style={{ flex: 1, paddingBottom: kbLift }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.md }}
          keyboardShouldPersistTaps="handled"
          // Tap-to-dismiss only (no swipe-to-dismiss) — scrolling up to re-read shouldn't close the
          // keyboard mid-reply. Tapping empty space still dismisses (keyboardShouldPersistTaps).
          showsVerticalScrollIndicator={false}
          // Follow the growing reply only after layout settles → smooth, no per-tick bounce.
          onContentSizeChange={followBottom}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            atBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
          }}
        >
          {isFresh && messages.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xxl, gap: theme.spacing.md }}>
              <View style={[{ borderRadius: 999 }, theme.shadow.glow]}>
                <Orb size={56} />
              </View>
              <Text variant="heading" style={{ textAlign: 'center' }}>Hey, I'm {chefName}</Text>
              <Text tone="muted" style={{ textAlign: 'center', maxWidth: 280 }}>
                Ask me anything about cooking — what to make tonight, how long you've got, or who you're feeding.
              </Text>
            </View>
          ) : null}
          {messages.map((m, i) => (
            <Bubble
              key={i}
              role={m.role}
              content={m.content}
              name={chefName}
              live={streaming && i === messages.length - 1 && m.role === 'assistant'}
            />
          ))}

          {/* Contextual recipe hand-off — appears ONLY after the chef explicitly offered the full
              recipe (server `offer` signal), so it's never a guess. Generates the structured recipe
              + Cook Mode instead of a streamed wall of text. Stays visible during generation +
              save with a shine sweep so the user sees that we're working on it. */}
          {!streaming && offerRecipe ? (
            <FadeInUp>
              <Pressable
                onPress={getRecipe}
                disabled={generateRecipe.isPending || saveRecipe.isPending}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    backgroundColor: theme.colors.primarySoft,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                    padding: theme.spacing.md,
                    marginBottom: theme.spacing.lg,
                    overflow: 'hidden',
                  },
                  theme.shadow.glow,
                ]}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: theme.colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="book-open" tone="primary" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="title" tone="primary">
                    {generateRecipe.isPending || saveRecipe.isPending
                      ? 'Cooking up the recipe…'
                      : 'Get the full recipe'}
                  </Text>
                  <Text variant="caption" tone="muted">
                    I'll write it all out with a step-by-step Cook Mode
                  </Text>
                </View>
                <Icon name="arrow-right" tone="primary" />
                <ShineOverlay
                  loading={generateRecipe.isPending || saveRecipe.isPending}
                  tint={`${theme.colors.primary}55`}
                />
              </Pressable>
            </FadeInUp>
          ) : null}

          {error ? (
            <Text tone="danger" variant="caption" style={{ textAlign: 'center' }}>{error}</Text>
          ) : null}
        </ScrollView>

        {/* Composer — a rounded panel with a vertical gradient from a soft elevated tone (top) down
            to the app background (bottom), so it reads as a card that dissolves into the background
            and the keyboard below it rather than a detached bar. */}
        <Gradient
          colors={[theme.colors.card, theme.colors.background]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            overflow: 'hidden',
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.sm + 2,
            paddingBottom: Math.max(theme.spacing.sm, insets.bottom),
            gap: theme.spacing.sm + 2,
          }}
        >

          {/* Primary actions */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <ActionButton
              icon="book-open"
              label={generateRecipe.isPending || saveRecipe.isPending ? 'Cooking up…' : 'Get full recipe'}
              onPress={getRecipe}
              disabled={generateRecipe.isPending || saveRecipe.isPending || streaming}
              loading={generateRecipe.isPending || saveRecipe.isPending}
              primary
            />
            <ActionButton
              icon="utensils"
              label="I cooked this"
              onPress={markCooked}
              disabled={feed.isPending}
            />
          </View>

          {/* Guiding constraint chips — hidden mid-reply to keep focus on the stream. */}
          {!streaming ? <RefinerChips profile={profile} onAppend={appendChip} /> : null}

          {/* Roomy input + send. Equal heights + flex-end keeps them aligned on one line, and the
              send button stays anchored to the bottom as the input grows to multiple lines. */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
                minHeight: 58,
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.xl,
                borderWidth: focused ? 2 : 1,
                borderColor: focused ? theme.colors.primary : theme.colors.border,
                paddingHorizontal: theme.spacing.sm + 4,
                paddingVertical: 8,
                maxHeight: 150,
              }}
            >
              {/* AI affordance — a gradient sparkles orb at the head of the input. */}
              <Orb size={30} />
              <View style={{ flex: 1 }}>
                <Input
                  ref={inputRef}
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
                    fontSize: 17,
                    lineHeight: 23,
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
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: canSend ? theme.colors.primary : theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="send" tone={canSend ? 'onPrimary' : 'subtle'} size="md" />
            </Pressable>
          </View>
        </Gradient>
      </Animated.View>
    </View>
  );
}

/** A primary composer action ("Get full recipe" / "I cooked this"). `primary` = brand-tinted.
 *  When `loading`, sweeps a shine across the surface to signal work in flight. */
function ActionButton({
  icon,
  label,
  onPress,
  disabled,
  primary,
  loading,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        paddingVertical: theme.spacing.sm + 4,
        borderRadius: theme.radius.lg,
        backgroundColor: primary ? theme.colors.primarySoft : theme.colors.surface,
        borderWidth: 1,
        borderColor: primary ? theme.colors.primary : theme.colors.border,
        opacity: disabled && !loading ? 0.5 : 1,
        overflow: 'hidden',
      }}
    >
      <Icon name={icon} tone="primary" size="sm" />
      <Text variant="label" tone={primary ? 'primary' : 'text'}>{label}</Text>
      <ShineOverlay loading={!!loading} tint={`${theme.colors.primary}55`} />
    </Pressable>
  );
}

/** A single refiner chip — tappable pill; `active` tints it brand for an expanded value-picker. */
function Chip({
  icon,
  label,
  onPress,
  active,
  chevron,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  chevron?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.border,
        paddingVertical: theme.spacing.xs + 2,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.pill,
      }}
    >
      <Icon name={icon} size="sm" color={active ? theme.colors.onPrimary : theme.colors.primary} />
      <Text variant="caption" style={{ color: active ? theme.colors.onPrimary : theme.colors.text }}>
        {label}
      </Text>
      {chevron ? (
        <Icon name="chevron-down" size="sm" color={active ? theme.colors.onPrimary : theme.colors.muted} />
      ) : null}
    </Pressable>
  );
}

/** The expanded value row for a quick-pick chip (servings / time). `highlight` marks the default. */
function ValueRow({
  options,
  highlight,
  onPick,
}: {
  options: string[];
  highlight?: string;
  onPick: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: 2 }}
    >
      {options.map((o) => {
        const hot = o === highlight;
        return (
          <Pressable
            key={o}
            onPress={() => onPick(o)}
            style={{
              minWidth: 48,
              alignItems: 'center',
              backgroundColor: hot ? theme.colors.primarySoft : theme.colors.card,
              borderWidth: 1,
              borderColor: hot ? theme.colors.primary : theme.colors.border,
              paddingVertical: theme.spacing.xs + 2,
              paddingHorizontal: theme.spacing.sm + 2,
              borderRadius: theme.radius.md,
            }}
          >
            <Text variant="label" tone={hot ? 'primary' : 'text'}>{o}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Refiner chips: value chips (Servings/Time) open an inline picker so any number/time fits;
 *  vibe chips append in one tap. Personalized from the taste profile (default servings, cuisine). */
function RefinerChips({ profile, onAppend }: { profile?: TasteProfile; onAppend: (phrase: string) => void }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState<'servings' | 'time' | null>(null);
  const defaultServings = profile?.household_size ?? 2;
  const cuisine = profile?.favorite_cuisines?.[0];

  const pick = (phrase: string) => {
    setExpanded(null);
    onAppend(phrase);
  };
  const toggle = (which: 'servings' | 'time') => {
    haptic.light();
    setExpanded((e) => (e === which ? null : which));
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: theme.spacing.sm }}
      >
        <Chip icon="users" label="Servings" chevron active={expanded === 'servings'} onPress={() => toggle('servings')} />
        <Chip icon="clock" label="Time" chevron active={expanded === 'time'} onPress={() => toggle('time')} />
        {cuisine ? (
          <Chip icon="utensils" label={cuisine} onPress={() => pick(`Something ${cuisine.toLowerCase()}.`)} />
        ) : null}
        <Chip icon="leaf" label="Healthy" onPress={() => pick('Something healthy, please.')} />
        <Chip icon="flame" label="High-protein" onPress={() => pick('I’d like something high-protein.')} />
        <Chip icon="heart" label="Comfort food" onPress={() => pick('I’m in the mood for comfort food.')} />
        <Chip icon="sparkles" label="Surprise me" onPress={() => pick('Surprise me!')} />
      </ScrollView>

      {expanded === 'servings' ? (
        <ValueRow
          options={['1', '2', '3', '4', '5', '6+']}
          highlight={defaultServings >= 6 ? '6+' : String(defaultServings)}
          onPick={(v) =>
            pick(
              v === '6+'
                ? 'I’m cooking for 6 or more people.'
                : `I’m cooking for ${v} ${v === '1' ? 'person' : 'people'}.`,
            )
          }
        />
      ) : null}
      {expanded === 'time' ? (
        <ValueRow
          options={['10', '15', '30', '45', '60+']}
          onPick={(v) =>
            pick(v === '60+' ? 'I’ve got about an hour to cook.' : `I’ve only got ${v} minutes.`)
          }
        />
      ) : null}
    </View>
  );
}
