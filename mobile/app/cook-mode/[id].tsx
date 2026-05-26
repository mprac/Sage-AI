/** Cook Mode — full-screen, one step at a time. Screen stays awake; finishing feeds the chef. */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Icon, Screen, Text } from '../../src/components/ui';
import { useRecipe } from '../../src/features/recipes/useRecipes';
import { useSage } from '../../src/features/sage/useSage';
import { haptic } from '../../src/lib/haptics';
import { useRecipeDraft } from '../../src/store/recipe';
import { useTheme } from '../../src/theme';
import type { Recipe } from '../../src/types/api';

export default function CookMode() {
  useKeepAwake(); // don't let the screen sleep mid-cook
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDraft = id === 'new';

  const draft = useRecipeDraft((s) => s.draft);
  const saved = useRecipe(isDraft ? null : id);
  const recipe: Recipe | undefined = isDraft ? draft ?? undefined : saved.data;

  const { feed } = useSage();
  const chefName = useSage().data?.name ?? 'Sage';
  const [step, setStep] = useState(0);

  if (!recipe) {
    return (
      <Screen>
        <Text tone="muted">Recipe not found.</Text>
      </Screen>
    );
  }

  const total = recipe.steps.length;
  const current = recipe.steps[step];
  const isLast = step === total - 1;

  function finish() {
    haptic.success();
    feed.mutate('cook', {
      onSuccess: (res) => {
        Alert.alert(
          'Bon appétit! 🎉',
          `You cooked ${recipe!.title}. ${chefName} is full and happy${res.leveled_up ? ` — and leveled up to ${res.pet.level}!` : '!'}`,
          [{ text: 'Done', onPress: () => router.back() }],
        );
      },
      onError: () => router.back(),
    });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: recipe.title }} />

      {/* Progress */}
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="caption" tone="muted">Step {step + 1} of {total}</Text>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.colors.surface, overflow: 'hidden' }}>
          <View style={{ width: `${((step + 1) / total) * 100}%`, height: '100%', backgroundColor: theme.colors.primary }} />
        </View>
      </View>

      {/* Big step text */}
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
        <Text style={{ fontFamily: theme.fonts.display, fontSize: 28, lineHeight: 36, letterSpacing: -0.4, color: theme.colors.title }}>
          {current.instruction}
        </Text>
        {current.tip ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
            <Icon name="sparkles" tone="primary" size="sm" />
            <Text tone="muted" style={{ flex: 1 }}>{current.tip}</Text>
          </View>
        ) : null}
      </View>

      {/* Controls */}
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Button title="Back" variant="secondary" disabled={step === 0} onPress={() => setStep((s) => Math.max(0, s - 1))} />
        </View>
        <View style={{ flex: 1 }}>
          {isLast ? (
            <Button title={`Done — feed ${chefName}`} loading={feed.isPending} onPress={finish} />
          ) : (
            <Button
              title="Next"
              icon="arrow-right"
              onPress={() => {
                haptic.light();
                setStep((s) => Math.min(total - 1, s + 1));
              }}
            />
          )}
        </View>
      </View>
    </Screen>
  );
}
