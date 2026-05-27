/** Recipe detail — full-bleed gradient hero under a transparent header, playlist widget, a tap-to-
 *  check ingredient list, a step timeline, and a sticky "Start cooking" bar. Handles the chat draft
 *  (`/recipe/new`) and saved recipes (`/recipe/:id`). */
import { useHeaderHeight } from '@react-navigation/elements';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, Gradient, Icon, Screen, Text } from '../../src/components/ui';
import { useRecipe, useSaveRecipe } from '../../src/features/recipes/useRecipes';
import { haptic } from '../../src/lib/haptics';
import { useRecipeDraft } from '../../src/store/recipe';
import { useTheme } from '../../src/theme';
import type { Recipe } from '../../src/types/api';

export default function RecipeDetail() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDraft = id === 'new';

  const draft = useRecipeDraft((s) => s.draft);
  const saved = useRecipe(isDraft ? null : id);
  const save = useSaveRecipe();

  const recipe: Recipe | undefined = isDraft ? draft ?? undefined : saved.data;

  // Local "have it" check-off for ingredients (a prep checklist) — resets each visit.
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!recipe) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {saved.isLoading ? <ActivityIndicator color={theme.colors.primary} /> : <Text tone="muted">Recipe not found.</Text>}
        </View>
      </Screen>
    );
  }

  function openPlaylist(service: 'spotify' | 'apple') {
    haptic.light();
    const q = encodeURIComponent(recipe!.playlist?.search_query ?? recipe!.title);
    const url =
      service === 'spotify'
        ? `https://open.spotify.com/search/${q}`
        : `https://music.apple.com/search?term=${q}`;
    Linking.openURL(url).catch(() => {});
  }

  function onSave() {
    haptic.light();
    save.mutate(recipe!, {
      onSuccess: () => {
        haptic.success();
        Alert.alert('Saved', 'Added to your cookbook.');
      },
      onError: () => Alert.alert('Hmm', "Couldn't save that recipe."),
    });
  }

  function toggleIngredient(i: number) {
    haptic.light();
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          // Transparent floating bar — the hero gradient flows up underneath it, no seam.
          headerTransparent: true,
          headerTitle: () => null,
          headerStyle: { backgroundColor: 'transparent' },
          headerRight: isDraft
            ? () => (
                <Pressable
                  onPress={onSave}
                  hitSlop={8}
                  style={[
                    {
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: theme.colors.card,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    theme.shadow.sm,
                  ]}
                >
                  {save.isPending ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Icon name="book-open" tone="primary" size="sm" />
                  )}
                </Pressable>
              )
            : undefined,
        }}
      />

      <Screen scroll padded={false}>
        {/* Hero — full-bleed vertical gradient that starts behind the transparent header (uniform
            tint, no seam) and melts into the page background at the bottom. */}
        <Gradient
          name="hero"
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            paddingTop: headerHeight + theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.xl,
            gap: theme.spacing.sm,
          }}
        >
          <Text variant="display">{recipe.title}</Text>
          <Text tone="muted" style={{ fontSize: 16, lineHeight: 24 }}>{recipe.summary}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
            {recipe.total_time_minutes ? <Badge icon="flame" label={`${recipe.total_time_minutes} min`} /> : null}
            {recipe.servings ? <Badge icon="user" label={`Serves ${recipe.servings}`} /> : null}
            <Badge icon="book-open" label={`${recipe.steps.length} steps`} />
          </View>
        </Gradient>

        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, gap: theme.spacing.lg }}>
          {/* Playlist — a little player widget */}
          {recipe.playlist ? (
            <Card variant="elevated" style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: theme.colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="music" tone="primary" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="title">Cooking playlist</Text>
                  <Text variant="caption" tone="muted">{recipe.playlist.vibe}</Text>
                </View>
              </View>
              <View style={{ gap: theme.spacing.xs }}>
                {recipe.playlist.tracks.slice(0, 5).map((t, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <Text variant="caption" tone="subtle" style={{ width: 16 }}>{i + 1}</Text>
                    <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                      {t.title}
                      <Text variant="caption" tone="muted"> — {t.artist}</Text>
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button title="Spotify" icon="play" onPress={() => openPlaylist('spotify')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Apple Music" variant="secondary" icon="music" onPress={() => openPlaylist('apple')} />
                </View>
              </View>
            </Card>
          ) : null}

          {/* Ingredients — tap to check off */}
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="heading">Ingredients</Text>
              <Text variant="caption" tone="muted">{checked.size}/{recipe.ingredients.length}</Text>
            </View>
            <Card>
              {recipe.ingredients.map((ing, i) => {
                const on = checked.has(i);
                const last = i === recipe.ingredients.length - 1;
                return (
                  <Pressable
                    key={i}
                    onPress={() => toggleIngredient(i)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      paddingVertical: theme.spacing.sm + 2,
                      borderBottomWidth: last ? 0 : 1,
                      borderBottomColor: theme.colors.divider,
                    }}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: on ? 0 : 1.5,
                        borderColor: theme.colors.border,
                        backgroundColor: on ? theme.colors.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {on ? <Icon name="check" color={theme.colors.onPrimary} size={14} /> : null}
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        color: on ? theme.colors.muted : theme.colors.text,
                        textDecorationLine: on ? 'line-through' : 'none',
                      }}
                    >
                      {ing.item}
                    </Text>
                    {ing.quantity ? <Text tone="muted" variant="caption">{ing.quantity}</Text> : null}
                  </Pressable>
                );
              })}
            </Card>
          </View>

          {/* Steps — vertical timeline */}
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="heading">Steps</Text>
            <View>
              {recipe.steps.map((s, i) => {
                const last = i === recipe.steps.length - 1;
                return (
                  <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                    {/* Rail: numbered node + connector line to the next step */}
                    <View style={{ alignItems: 'center', width: 30 }}>
                      <Gradient
                        name="brand"
                        style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text variant="label" tone="onPrimary">{i + 1}</Text>
                      </Gradient>
                      {!last ? (
                        <View style={{ flex: 1, width: 2, backgroundColor: theme.colors.divider, marginVertical: 4 }} />
                      ) : null}
                    </View>
                    {/* Step content */}
                    <View style={{ flex: 1, paddingBottom: last ? 0 : theme.spacing.lg, gap: 6, paddingTop: 3 }}>
                      <Text style={{ lineHeight: 24 }}>{s.instruction}</Text>
                      {s.tip ? (
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                          <Icon name="sparkles" tone="primary" size="sm" />
                          <Text variant="caption" tone="muted" style={{ flex: 1 }}>{s.tip}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Spacer so the sticky footer never covers the last step */}
          <View style={{ height: insets.bottom + 84 }} />
        </View>
      </Screen>

      {/* Sticky action bar — always one tap from cooking */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.background,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: Math.max(theme.spacing.md, insets.bottom),
        }}
      >
        {/* Soft fade so content dissolves into the bar instead of meeting a hard edge */}
        <View pointerEvents="none" style={{ position: 'absolute', top: -24, left: 0, right: 0, height: 24 }}>
          <Gradient
            colors={[`${theme.colors.background}00`, theme.colors.background]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>
        <Button title="Start cooking" icon="play" onPress={() => router.push(`/cook-mode/${id}`)} />
      </View>
    </View>
  );
}
