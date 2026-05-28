/** Recipes tab — your saved cookbook. Tap to view; swipe a card left to tweak it in chat or delete it. */
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Card, EmptyState, FadeInUp, Icon, Screen, SwipeRow, Text } from '../../src/components/ui';
import { useDeleteRecipe, useRecipes } from '../../src/features/recipes/useRecipes';
import { useSeason } from '../../src/features/sage/useSeason';
import { showSnackbar } from '../../src/store/snackbar';
import { useTheme } from '../../src/theme';
import type { RecipeSummary } from '../../src/types/api';

export default function Recipes() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: recipes, isLoading, refetch, isRefetching } = useRecipes();
  const del = useDeleteRecipe();
  const { data: season } = useSeason();

  // Bottom-tab screens stay mounted after first visit, so React Query's refetchOnMount never
  // re-fires on tab switches (and RN has no window focus). Refetch on focus so a recipe saved
  // from the chat → recipe-detail flow appears the moment you open the cookbook — no reload needed.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // Delete with Undo: drop the row instantly, but defer the real DELETE until the snackbar expires —
  // tapping Undo restores the cache and the network call never happens.
  function deleteRecipe(r: RecipeSummary) {
    const prev = qc.getQueryData<RecipeSummary[]>(['recipes']);
    qc.setQueryData<RecipeSummary[]>(['recipes'], (l) => (l ?? []).filter((x) => x.id !== r.id));
    showSnackbar({
      message: 'Recipe deleted',
      actionLabel: 'Undo',
      onAction: () => qc.setQueryData(['recipes'], prev),
      onExpire: () => del.mutate(r.id, { onError: () => qc.invalidateQueries({ queryKey: ['recipes'] }) }),
    });
  }

  function tweakRecipe(r: RecipeSummary) {
    router.push(r.session_id ? `/chat/${r.session_id}?resume=1&tweak=${r.id}` : `/chat/new?fresh=1&tweak=${r.id}`);
  }

  if (isLoading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!recipes || recipes.length === 0) {
    const featured = season?.produce[0]?.display_name?.toLowerCase();
    const subtitle = featured
      ? `${featured.charAt(0).toUpperCase() + featured.slice(1)} is at peak right now — chat with your chef and save what you cook here.`
      : 'Chat with your chef and tap "Get the full recipe" to save your favourites here.';
    return (
      <Screen>
        <EmptyState
          icon="book-open"
          title="Your cookbook is empty"
          subtitle={subtitle}
          actionLabel="Start cooking"
          onAction={() => router.navigate('/cook')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll tabBarSpacing onRefresh={refetch} refreshing={isRefetching}>
      <Text variant="heading">Cookbook</Text>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
        {recipes.map((r, i) => (
          <FadeInUp key={r.id} index={i}>
            <SwipeRow
              actions={[
                { icon: 'message-circle', label: 'Tweak', tone: 'primary', onPress: () => tweakRecipe(r) },
                { icon: 'trash', label: 'Delete', tone: 'danger', onPress: () => deleteRecipe(r) },
              ]}
            >
              <Pressable onPress={() => router.push(`/recipe/${r.id}`)}>
                {/* Square — SwipeRow's wrapper owns the (animated) rounding so the right corners can
                    flatten to meet the actions. */}
                <Card style={{ borderRadius: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: theme.colors.primarySoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="utensils" tone="primary" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="title" numberOfLines={1}>{r.title}</Text>
                      {r.total_time_minutes ? (
                        <Text variant="caption" tone="muted">{r.total_time_minutes} min</Text>
                      ) : null}
                    </View>
                    <Icon name="arrow-right" tone="subtle" size="sm" />
                  </View>
                </Card>
              </Pressable>
            </SwipeRow>
          </FadeInUp>
        ))}
      </View>
    </Screen>
  );
}
