/** The Almanac — vertical timeline of past seasonal harvests, newest first.
 *
 * Reads `seasonal_harvests` directly (bounded growth: 4 rows/user/year), never raw care_events.
 * Each card shows the season + year, harvest progress, cooks count, and earned badges.
 */
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { Badge, Card, EmptyState, Icon, type IconName, Screen, Text } from '../src/components/ui';
import { HarvestMeter } from '../src/features/sage/HarvestMeter';
import { useAlmanac, useSeason } from '../src/features/sage/useSeason';
import { useTheme } from '../src/theme';
import type { AlmanacEntry, Season } from '../src/types/api';

function awardLabel(slug: string): string {
  // e.g. "fall-2026-harvester" → "Fall 2026 Harvester"
  return slug
    .split('-')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ');
}

function AlmanacRow({ entry }: { entry: AlmanacEntry }) {
  const theme = useTheme();
  const palette = theme.seasonPalette[entry.season as Season];
  return (
    <Card variant="elevated" style={{ marginBottom: theme.spacing.md, gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <HarvestMeter
          cooked={entry.ingredients_cooked.length}
          total={12}
          season={entry.season as Season}
          size={64}
          strokeWidth={5}
        />
        <View style={{ flex: 1 }}>
          <Text variant="overline" style={{ color: palette.ring[0] }}>
            {palette.label.toUpperCase()} {entry.year}
          </Text>
          <Text variant="title">
            {entry.ingredients_cooked.length}/12 hero ingredients
          </Text>
          <Text variant="caption" tone="muted">
            {entry.cooks_count} cook{entry.cooks_count === 1 ? '' : 's'}
            {entry.completed_at ? ' • completed' : ''}
          </Text>
        </View>
      </View>
      {entry.awards_earned.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          {entry.awards_earned.map((slug) => (
            <Badge
              key={slug}
              label={awardLabel(slug)}
              fg={theme.colors.accent}
              bg={theme.colors.accentSoft}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

export default function AlmanacScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data: entries, isLoading } = useAlmanac();
  const { data: currentSeason } = useSeason();

  // Merge: show the current season at the top (even if not yet in entries[]) and dedup.
  const rows = useMemo<AlmanacEntry[]>(() => {
    const all = entries ?? [];
    if (!currentSeason) return all;
    const exists = all.some(
      (e) => e.season === currentSeason.season && e.year === currentSeason.year,
    );
    if (exists) return all;
    const synthetic: AlmanacEntry = {
      season: currentSeason.season,
      year: currentSeason.year,
      hemisphere: currentSeason.hemisphere,
      ingredients_cooked: currentSeason.harvest.cooked,
      cooks_count: currentSeason.harvest.cooks_count,
      awards_earned: currentSeason.harvest.awards_earned,
      started_at: currentSeason.harvest.started_at ?? new Date().toISOString(),
      completed_at: currentSeason.harvest.completed_at,
    };
    return [synthetic, ...all];
  }, [entries, currentSeason]);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingBottom: theme.spacing.md }}>
        <Icon name="book-open" tone="primary" />
        <View style={{ flex: 1 }}>
          <Text variant="display">Your year of cooking</Text>
          <Text variant="caption" tone="muted">
            One season at a time. Cooking with in-season produce fills the harvest.
          </Text>
        </View>
      </View>
      {isLoading && rows.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={'sprout' as IconName}
          title="A fresh almanac"
          subtitle="Cook with an in-season ingredient to plant your first entry."
          actionLabel="Start cooking"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(e) => `${e.year}-${e.season}`}
          renderItem={({ item }) => <AlmanacRow entry={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}
