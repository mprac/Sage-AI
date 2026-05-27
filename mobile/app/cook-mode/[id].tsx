/** Cook Mode — full-screen, one step at a time as swipeable slides. Screen stays awake; segmented
 *  progress shows how far you are; finishing feeds the chef. */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Screen, Text } from '../../src/components/ui';
import { useRecipe } from '../../src/features/recipes/useRecipes';
import { useSage } from '../../src/features/sage/useSage';
import { haptic } from '../../src/lib/haptics';
import { useRecipeDraft } from '../../src/store/recipe';
import { useTheme } from '../../src/theme';
import type { Recipe, RecipeStep } from '../../src/types/api';

export default function CookMode() {
  useKeepAwake(); // don't let the screen sleep mid-cook
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDraft = id === 'new';

  const draft = useRecipeDraft((s) => s.draft);
  const saved = useRecipe(isDraft ? null : id);
  const recipe: Recipe | undefined = isDraft ? draft ?? undefined : saved.data;

  const { feed } = useSage();
  const chefName = useSage().data?.name ?? 'Sage';
  const [step, setStep] = useState(0);
  const listRef = useRef<FlatList<RecipeStep>>(null);

  if (!recipe) {
    return (
      <Screen>
        <Text tone="muted">Recipe not found.</Text>
      </Screen>
    );
  }

  const total = recipe.steps.length;
  const isLast = step === total - 1;

  function goTo(i: number) {
    const clamped = Math.max(0, Math.min(total - 1, i));
    haptic.light();
    setStep(clamped);
    listRef.current?.scrollToOffset({ offset: clamped * width, animated: true });
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== step) {
      setStep(i);
      haptic.light();
    }
  }

  function finish() {
    haptic.success();
    feed.mutate('cook', {
      onSuccess: (res) => {
        Alert.alert(
          'Bon appétit!',
          `You cooked ${recipe!.title}. ${chefName} is full and happy${res.leveled_up ? ` — and leveled up to ${res.pet.level}!` : '!'}`,
          [{ text: 'Done', onPress: () => router.back() }],
        );
      },
      onError: () => router.back(),
    });
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: recipe.title }} />

      {/* Segmented progress — position + total length at a glance */}
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, gap: theme.spacing.sm }}>
        <Text variant="caption" tone="muted">Step {step + 1} of {total}</Text>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {recipe.steps.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 999,
                backgroundColor: i <= step ? theme.colors.primary : theme.colors.surface,
              }}
            />
          ))}
        </View>
      </View>

      {/* Swipeable step slides */}
      <FlatList
        ref={listRef}
        data={recipe.steps}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={{ flex: 1 }}
        renderItem={({ item, index }) => (
          <View style={{ width }}>
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.lg }}>
              <Text variant="overline" tone="primary">STEP {index + 1}</Text>
              <Text
                style={{
                  fontFamily: theme.fonts.display,
                  fontSize: 28,
                  lineHeight: 36,
                  letterSpacing: -0.4,
                  color: theme.colors.title,
                }}
              >
                {item.instruction}
              </Text>
              {item.tip ? (
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
                  <Icon name="sparkles" tone="primary" size="sm" />
                  <Text tone="muted" style={{ flex: 1 }}>{item.tip}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      />

      {/* Controls — stay in sync with swipes via the shared `step` */}
      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: Math.max(theme.spacing.md, insets.bottom),
        }}
      >
        <View style={{ flex: 1 }}>
          <Button title="Back" variant="secondary" disabled={step === 0} onPress={() => goTo(step - 1)} />
        </View>
        <View style={{ flex: 1 }}>
          {isLast ? (
            <Button title={`Done — feed ${chefName}`} loading={feed.isPending} onPress={finish} />
          ) : (
            <Button title="Next" icon="arrow-right" onPress={() => goTo(step + 1)} />
          )}
        </View>
      </View>
    </Screen>
  );
}
