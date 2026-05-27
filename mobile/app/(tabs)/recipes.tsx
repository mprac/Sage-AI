/** Recipes tab — your saved cookbook. Tap to view, long-press to delete. */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { Card, EmptyState, FadeInUp, Icon, Screen, Text } from '../../src/components/ui';
import { useDeleteRecipe, useRecipes } from '../../src/features/recipes/useRecipes';
import { useTheme } from '../../src/theme';

export default function Recipes() {
  const theme = useTheme();
  const router = useRouter();
  const { data: recipes, isLoading, refetch, isRefetching } = useRecipes();
  const del = useDeleteRecipe();

  // Bottom-tab screens stay mounted after first visit, so React Query's refetchOnMount never
  // re-fires on tab switches (and RN has no window focus). Refetch on focus so a recipe saved
  // from the chat → recipe-detail flow appears the moment you open the cookbook — no reload needed.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

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
    return (
      <Screen>
        <EmptyState
          icon="book-open"
          title="Your cookbook is empty"
          subtitle='Chat with your chef and tap "Get the full recipe" to save your favourites here.'
          actionLabel="Start cooking"
          onAction={() => router.navigate('/cook')}
        />
      </Screen>
    );
  }

  function confirmDelete(id: string, title: string) {
    Alert.alert('Delete recipe', `Remove "${title}" from your cookbook?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(id) },
    ]);
  }

  return (
    <Screen scroll onRefresh={refetch} refreshing={isRefetching}>
      <Text variant="heading">Cookbook</Text>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
        {recipes.map((r, i) => (
          <FadeInUp key={r.id} index={i}>
            <Pressable
              onPress={() => router.push(`/recipe/${r.id}`)}
              onLongPress={() => confirmDelete(r.id, r.title)}
            >
              <Card>
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
          </FadeInUp>
        ))}
      </View>
    </Screen>
  );
}
