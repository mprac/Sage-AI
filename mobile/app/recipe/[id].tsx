/** Recipe detail — gradient hero, ingredient chips, numbered steps, cooking playlist, save + cook. */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Linking, View } from 'react-native';

import { Badge, Button, Card, Gradient, Icon, Screen, Text } from '../../src/components/ui';
import { useRecipe, useSaveRecipe } from '../../src/features/recipes/useRecipes';
import { haptic } from '../../src/lib/haptics';
import { useRecipeDraft } from '../../src/store/recipe';
import { useTheme } from '../../src/theme';
import type { Recipe } from '../../src/types/api';

export default function RecipeDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDraft = id === 'new';

  const draft = useRecipeDraft((s) => s.draft);
  const saved = useRecipe(isDraft ? null : id);
  const save = useSaveRecipe();

  const recipe: Recipe | undefined = isDraft ? draft ?? undefined : saved.data;

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

  return (
    <Screen scroll padded={false}>
      <Stack.Screen options={{ title: recipe.title }} />

      {/* Hero */}
      <Gradient name="hero" style={{ padding: theme.spacing.lg, paddingTop: theme.spacing.xl, gap: theme.spacing.sm }}>
        <Text variant="display">{recipe.title}</Text>
        <Text tone="muted">{recipe.summary}</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
          {recipe.total_time_minutes ? <Badge icon="flame" label={`${recipe.total_time_minutes} min`} /> : null}
          {recipe.servings ? <Badge icon="user" label={`Serves ${recipe.servings}`} /> : null}
        </View>
      </Gradient>

      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        {/* Playlist */}
        {recipe.playlist ? (
          <Card variant="elevated" style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
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
            {recipe.playlist.tracks.slice(0, 5).map((t, i) => (
              <Text key={i} variant="caption" tone="muted">{t.title} — {t.artist}</Text>
            ))}
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button title="Spotify" variant="secondary" icon="play" onPress={() => openPlaylist('spotify')} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Apple Music" variant="secondary" icon="music" onPress={() => openPlaylist('apple')} />
              </View>
            </View>
          </Card>
        ) : null}

        {/* Ingredients */}
        <Text variant="heading">Ingredients</Text>
        <Card style={{ gap: theme.spacing.sm }}>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.primary }} />
                <Text style={{ flex: 1 }}>{ing.item}</Text>
              </View>
              {ing.quantity ? <Text tone="muted" variant="caption">{ing.quantity}</Text> : null}
            </View>
          ))}
        </Card>

        {/* Steps */}
        <Text variant="heading">Steps</Text>
        <View style={{ gap: theme.spacing.sm }}>
          {recipe.steps.map((s, i) => (
            <Card key={i} style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'flex-start' }}>
              <Gradient
                name="brand"
                style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text variant="label" tone="onPrimary">{i + 1}</Text>
              </Gradient>
              <View style={{ flex: 1, gap: 4 }}>
                <Text>{s.instruction}</Text>
                {s.tip ? (
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                    <Icon name="sparkles" tone="primary" size="sm" />
                    <Text variant="caption" tone="muted" style={{ flex: 1 }}>{s.tip}</Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ))}
        </View>

        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
          <Button title="Start cooking" icon="play" onPress={() => router.push(`/cook-mode/${id}`)} />
          {isDraft ? (
            <Button title="Save to cookbook" variant="secondary" icon="book-open" loading={save.isPending} onPress={onSave} />
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
