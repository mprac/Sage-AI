/** Detected-foods results — editable category-colored list, then jump into chat.
 *  Persisted via Zustand+AsyncStorage and rehydrates from the backend on cold-start.
 *
 *  The Add/Edit "sheet" is rendered IN-SCREEN (not via React Native's Modal) so we can drive
 *  smooth keyboard-synced motion on both platforms. Modal lives in its own native window which
 *  doesn't play well with `windowSoftInputMode=adjustResize` on Android, leading to either the
 *  keyboard covering the buttons or a jarring "yank" when it appears. Inline + Reanimated +
 *  Keyboard events gives us a single, consistent, production-grade behavior. */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  type KeyboardEvent,
  Platform,
  Pressable,
  StyleSheet,
  type TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, EmptyState, FadeInUp, Gradient, Icon, Input, Screen, Text } from '../../src/components/ui';
import { useRecognition } from '../../src/features/recognition/useRecognition';
import { haptic } from '../../src/lib/haptics';
import { showSnackbar } from '../../src/store/snackbar';
import { categoryColors, useTheme } from '../../src/theme';
import type { DetectedFood } from '../../src/types/api';

const SAVE_DEBOUNCE_MS = 600;
const SHEET_HIDDEN_OFFSET = 600; // px the sheet slides down by when dismissed
const DEFAULT_NEW_FOOD: DetectedFood = {
  name: '',
  category: 'other',
  confidence: 1,
  estimated_quantity: null,
};

type EditState = { kind: 'edit'; index: number } | { kind: 'new' } | null;

export default function RecognitionResultScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, patch } = useRecognition(id);

  const [foods, setFoods] = useState<DetectedFood[]>([]);
  const [editState, setEditState] = useState<EditState>(null);

  useEffect(() => {
    if (data) setFoods(data.foods);
  }, [data]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSave(next: DetectedFood[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      patch.mutate(next, {
        onSuccess: () => showSnackbar({ message: 'Saved' }),
      });
    }, SAVE_DEBOUNCE_MS);
  }

  function commit(next: DetectedFood[]) {
    setFoods(next);
    scheduleSave(next);
  }

  function removeAt(i: number) {
    haptic.light();
    commit(foods.filter((_, k) => k !== i));
  }

  function startAddIngredient() {
    haptic.light();
    setEditState({ kind: 'new' });
  }

  function startEditIngredient(index: number) {
    setEditState({ kind: 'edit', index });
  }

  function onSheetSave(values: { name: string; quantity: string }) {
    const name = values.name.trim();
    if (!name) return;
    const quantity = values.quantity.trim() || null;
    if (!editState) return;
    if (editState.kind === 'edit') {
      commit(
        foods.map((f, k) =>
          k === editState.index ? { ...f, name, estimated_quantity: quantity } : f,
        ),
      );
    } else {
      commit([...foods, { ...DEFAULT_NEW_FOOD, name, estimated_quantity: quantity }]);
    }
    setEditState(null);
  }

  function closeSheet() {
    setEditState(null);
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <EmptyState
          icon="camera"
          title="Couldn't find that kitchen"
          subtitle="The list isn't on this device. Take a new photo to start fresh."
          actionLabel="Take a new photo"
          onAction={() => router.replace('/cook')}
        />
      </Screen>
    );
  }

  const editingFood =
    editState?.kind === 'edit' ? foods[editState.index] ?? null : null;

  // Root View wraps the Screen and the overlay sheet so the sheet escapes the Screen's ScrollView
  // and can sit above all content.
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Screen scroll>
        <Text variant="heading">I spotted {foods.length} item{foods.length === 1 ? '' : 's'}</Text>
        <Text variant="body" tone="muted">Tap a row to edit, X to remove, or add anything I missed.</Text>

        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
          {foods.map((f, i) => {
            const cat = categoryColors[f.category?.toLowerCase()] ?? categoryColors.other;
            return (
              <FadeInUp key={`${i}-${f.name}`} index={i}>
                <Card style={{ paddingVertical: theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Pressable
                      onPress={() => startEditIngredient(i)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 }}
                    >
                      <View style={{ width: 10, height: 40, borderRadius: 5, backgroundColor: cat.fg }} />
                      <View style={{ flex: 1 }}>
                        <Text variant="title" numberOfLines={1}>
                          {f.name || 'Untitled'}
                        </Text>
                        <View
                          style={{
                            alignSelf: 'flex-start',
                            backgroundColor: cat.bg,
                            borderRadius: theme.radius.pill,
                            paddingVertical: 2,
                            paddingHorizontal: theme.spacing.sm,
                            marginTop: 3,
                          }}
                        >
                          <Text variant="overline" style={{ color: cat.fg }}>
                            {f.category.toUpperCase()}
                            {f.estimated_quantity ? ` · ${f.estimated_quantity}` : ''}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Text variant="caption" tone="subtle">{Math.round(f.confidence * 100)}%</Text>
                      <Pressable
                        onPress={() => removeAt(i)}
                        hitSlop={10}
                        style={{ padding: theme.spacing.xs }}
                      >
                        <Icon name="x" tone="muted" size="sm" />
                      </Pressable>
                    </View>
                  </View>
                </Card>
              </FadeInUp>
            );
          })}

          <Pressable onPress={startAddIngredient}>
            <View
              style={{
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                paddingVertical: theme.spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <Icon name="plus" tone="muted" size="sm" />
              <Text variant="label" tone="muted">Add ingredient</Text>
            </View>
          </Pressable>
        </View>

        <Button
          title="What can I make?"
          icon="sparkles"
          style={{ marginTop: theme.spacing.md }}
          onPress={() => router.push(`/chat/${data.id}`)}
        />
      </Screen>

      <EditSheet
        visible={editState !== null}
        mode={editState?.kind ?? 'new'}
        initial={editingFood}
        onClose={closeSheet}
        onSave={onSheetSave}
      />
    </View>
  );
}

/** Production-grade bottom sheet.
 *
 *  - Renders inline (not via RN Modal) so keyboard events apply consistently across platforms.
 *  - Backdrop fades in; sheet springs up. Both animations run on the UI thread via Reanimated.
 *  - Keyboard tracking: subscribes to keyboardWillShow/Hide (iOS) or keyboardDidShow/Hide
 *    (Android) and animates the sheet's translateY so it rises with the keyboard in lock-step
 *    (matching the OS's animation duration when available) — no "yank".
 *  - Buttons are raw `Pressable` + `Text` rather than the shared `Button` component to keep
 *    rendering inside the sheet bulletproof and obviously-readable.
 *  - Keyboard return-key flow: Name field → "next" → focuses Quantity; Quantity field → "done"
 *    → submits Save (if name is non-empty), exactly like the user expects from a native form.
 *  - Hardware back button (Android) dismisses the sheet, not the screen. */
function EditSheet({
  visible,
  mode,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  mode: 'new' | 'edit';
  initial: DetectedFood | null;
  onClose: () => void;
  onSave: (values: { name: string; quantity: string }) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [mounted, setMounted] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const quantityRef = useRef<TextInput>(null);

  const translateY = useSharedValue(SHEET_HIDDEN_OFFSET);
  const backdropOpacity = useSharedValue(0);
  const keyboardLift = useSharedValue(0);

  // Open / close animations
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setName(initial?.name ?? '');
      setQuantity(initial?.estimated_quantity ?? '');
      translateY.value = withSpring(0, {
        damping: 22,
        stiffness: 230,
        mass: 0.9,
        overshootClamping: false,
      });
      backdropOpacity.value = withTiming(1, { duration: 220 });
      // Focus once the sheet has visibly arrived — autoFocus on RN inputs inside a freshly
      // mounted view is unreliable on Android, so we focus by ref after a short delay.
      const t = setTimeout(() => nameRef.current?.focus(), 250);
      return () => clearTimeout(t);
    } else if (mounted) {
      Keyboard.dismiss();
      translateY.value = withTiming(
        SHEET_HIDDEN_OFFSET,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard tracking — animate the sheet's translateY in lock-step with the keyboard's own
  // animation. iOS provides `e.duration` and start/end coordinates; Android only fires after the
  // keyboard is shown, so we approximate with a short timing.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e: KeyboardEvent) => {
      const duration = (e.duration && e.duration > 0) ? e.duration : 220;
      keyboardLift.value = withTiming(e.endCoordinates.height, {
        duration,
        easing: Easing.bezier(0.17, 0.59, 0.4, 0.77),
      });
    });
    const hideSub = Keyboard.addListener(hideEvt, (e: KeyboardEvent) => {
      const duration = (e.duration && e.duration > 0) ? e.duration : 200;
      keyboardLift.value = withTiming(0, {
        duration,
        easing: Easing.bezier(0.17, 0.59, 0.4, 0.77),
      });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardLift]);

  // Android hardware back dismisses the sheet, not the screen.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - keyboardLift.value }],
  }));

  if (!mounted) return null;

  const canSave = name.trim().length > 0;
  const ctaLabel = mode === 'new' ? 'Add' : 'Save';

  const submit = () => {
    if (!canSave) return;
    haptic.light();
    onSave({ name, quantity });
  };

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]} pointerEvents="box-none">
      {/* Tap-to-dismiss layer — invisible so the sheet reads as part of the page, not floating
          over a dimmed backdrop. (Same feel as the chat composer.) */}
      <Animated.View style={[StyleSheet.absoluteFillObject, backdropStyle]}>
        <Pressable
          style={{ flex: 1 }}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          accessibilityLabel="Dismiss"
        />
      </Animated.View>

      {/* Sheet — slides up, follows the keyboard. A single Gradient surface, no outer card-color
          wrapper and no shadow, so the bottom edge (`background`) lands directly on the page
          (also `background`) and the two read as one continuous surface — matching the chat
          composer pattern. */}
      <Animated.View
        style={[
          { position: 'absolute', left: 0, right: 0, bottom: 0 },
          sheetStyle,
        ]}
      >
        <Gradient
          colors={[theme.colors.card, theme.colors.background]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.md,
            paddingBottom: Math.max(insets.bottom, theme.spacing.md) + theme.spacing.sm,
            gap: theme.spacing.md,
            overflow: 'hidden',
          }}
        >
          {/* Grab handle — a visual cue this is a sheet you can dismiss */}
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.colors.border,
              marginBottom: theme.spacing.xs,
            }}
          />

          <Text variant="title">
            {mode === 'new' ? 'Add ingredient' : 'Edit ingredient'}
          </Text>

          <Input
            ref={nameRef}
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. red bell pepper"
            autoCapitalize="none"
            autoCorrect
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => quantityRef.current?.focus()}
          />
          <Input
            ref={quantityRef}
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="optional · '2 pieces', '~1 cup'"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          {/* Action row — raw Pressable + Text so the labels can never go missing. */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.card,
                borderWidth: 1,
                borderColor: theme.colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text variant="label" style={{ color: theme.colors.text }}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={!canSave}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canSave ? (pressed ? 0.85 : 1) : 0.4,
              })}
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              accessibilityState={{ disabled: !canSave }}
            >
              <Text variant="label" style={{ color: theme.colors.onPrimary }}>
                {ctaLabel}
              </Text>
            </Pressable>
          </View>
        </Gradient>
      </Animated.View>
    </View>
  );
}
