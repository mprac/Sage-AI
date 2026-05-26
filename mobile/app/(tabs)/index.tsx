/** Sage home — a single fixed screen (no scroll), solid background, no gradient. Avatar + stats +
 *  actions distributed to fit. Theme-driven + haptics. */
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  type IconName,
  Screen,
  Text,
} from '../../src/components/ui';
import { SageAvatar } from '../../src/features/sage/SageAvatar';
import { scheduleHungerReminder } from '../../src/features/sage/notifications';
import { useCosmetics, useSage } from '../../src/features/sage/useSage';
import { ApiError } from '../../src/lib/api';
import { haptic } from '../../src/lib/haptics';
import { useTheme } from '../../src/theme';
import type { Cosmetic, SageState } from '../../src/types/api';

function moodColor(state: SageState, theme: ReturnType<typeof useTheme>) {
  if (state === 'thriving' || state === 'content') return theme.colors.success;
  if (state === 'peckish') return theme.colors.warning;
  return theme.colors.danger;
}

function Bar({ value, color, track }: { value: number; color: string; track: string }) {
  return (
    <View style={{ height: 10, borderRadius: 999, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} tone="primary" size="sm" />
      </View>
      <Text variant="title">{value}</Text>
      <Text variant="caption" tone="muted">{label}</Text>
    </View>
  );
}

export default function SageHome() {
  const theme = useTheme();
  const router = useRouter();
  const { data: sage, isLoading, isError, refetch, treat, rename } = useSage();
  const { data: cosmetics } = useCosmetics();

  useEffect(() => {
    if (sage) scheduleHungerReminder(sage);
  }, [sage?.hours_until_hungry, sage?.is_dormant]);

  if (isError && !sage) {
    return (
      <Screen>
        <EmptyState
          icon="refresh"
          title="Can't reach the kitchen"
          subtitle="Couldn't connect to the server. Check the backend is running and you're on the same Wi-Fi."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </Screen>
    );
  }

  if (isLoading || !sage) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  const find = (id?: string) => (cosmetics ?? []).find((c: Cosmetic) => c.id === id);
  const accessoryIcon = (find(sage.equipped?.hat)?.icon ?? find(sage.equipped?.accessory)?.icon) as IconName | undefined;
  const themeColor = find(sage.equipped?.theme)?.color ?? null;
  const mood = moodColor(sage.state, theme);
  const xpPct = (sage.xp / sage.xp_to_next) * 100;

  function promptRename() {
    Alert.prompt?.('Name your chef', 'What should we call your companion?', (name) => {
      if (name?.trim()) rename.mutate(name.trim());
    });
  }

  function giveTreat() {
    haptic.medium();
    treat.mutate(undefined, {
      onSuccess: () => haptic.success(),
      onError: (e) => {
        if (e instanceof ApiError && e.status === 402) {
          Alert.alert('Out of credits', `Get more credits to treat ${sage!.name}.`, [
            { text: 'Not now' },
            { text: 'Get credits', onPress: () => router.push('/wallet') },
          ]);
        }
      },
    });
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        {/* Hero (no gradient, solid background) */}
        <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
          <SageAvatar
            vitality={sage.vitality}
            moodColor={mood}
            themeColor={themeColor}
            accessoryIcon={accessoryIcon}
            dormant={sage.is_dormant}
          />
          <Pressable
            onPress={promptRename}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}
          >
            <Text variant="display">{sage.name}</Text>
            <Icon name="pencil" tone="muted" size="sm" />
          </Pressable>
          <Badge label={sage.mood} fg={mood} bg={theme.colors.surface} />
          <Text tone="text" style={{ textAlign: 'center', maxWidth: 320, fontSize: 24, lineHeight: 32 }}>
            {sage.message}
          </Text>
        </View>

        {/* Stats */}
        <Card variant="elevated" style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" tone="muted">Vitality</Text>
              <Text variant="caption" tone="muted">{sage.vitality}/100</Text>
            </View>
            <Bar value={sage.vitality} color={mood} track={theme.colors.surface} />
          </View>
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" tone="muted">Level {sage.level}</Text>
              <Text variant="caption" tone="muted">{sage.xp}/{sage.xp_to_next} XP</Text>
            </View>
            <Bar value={xpPct} color={theme.colors.primary} track={theme.colors.surface} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.colors.divider }} />
          <View style={{ flexDirection: 'row' }}>
            <Stat icon="flame" value={sage.streak_days} label="day streak" />
            <Stat icon="heart" value={sage.bond_level} label="bond" />
            <Stat icon="trophy" value={sage.longest_streak} label="best" />
          </View>
        </Card>

        {/* Actions */}
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            title={sage.is_dormant ? `Cook to revive ${sage.name}` : `Cook now — feed ${sage.name}`}
            icon="camera"
            onPress={() => router.navigate('/cook')}
          />
          <Button title="Give a treat (40 credits)" variant="secondary" icon="gem" loading={treat.isPending} onPress={giveTreat} />
          <Button title={`${sage.name}'s closet`} variant="ghost" icon="shopping-bag" onPress={() => router.push('/shop')} />
        </View>
      </View>
    </Screen>
  );
}
