/** Sage home — your AI chef companion. Vitality, mood, level, streak + care actions. */
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { Button, Card, Screen, Text } from '../../src/components/ui';
import { SageAvatar } from '../../src/features/sage/SageAvatar';
import { scheduleHungerReminder } from '../../src/features/sage/notifications';
import { useCosmetics, useSage } from '../../src/features/sage/useSage';
import { ApiError } from '../../src/lib/api';
import { useTheme } from '../../src/theme';
import type { SageState } from '../../src/types/api';

function barColor(state: SageState, theme: ReturnType<typeof useTheme>) {
  if (state === 'thriving' || state === 'content') return theme.colors.success;
  if (state === 'peckish') return theme.colors.warning;
  return theme.colors.danger;
}

function Bar({ value, color, track }: { value: number; color: string; track: string }) {
  return (
    <View style={{ height: 12, borderRadius: 999, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

export default function SageHome() {
  const theme = useTheme();
  const router = useRouter();
  const { data: sage, isLoading, isError, refetch, treat, rename } = useSage();
  const { data: cosmetics } = useCosmetics();

  // Reschedule the local "getting hungry" reminder whenever Sage's predicted state changes.
  useEffect(() => {
    if (sage) scheduleHungerReminder(sage);
  }, [sage?.hours_until_hungry, sage?.is_dormant]);

  if (isError && !sage) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md }}>
          <Text variant="heading">Can't reach the kitchen</Text>
          <Text tone="muted" style={{ textAlign: 'center' }}>
            Couldn't connect to the server. Make sure the backend is running and your phone is on the
            same Wi-Fi.
          </Text>
          <Button title="Retry" fullWidth={false} onPress={() => refetch()} />
        </View>
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

  const hatId = sage.equipped?.hat;
  const hatEmoji = cosmetics?.find((c) => c.id === hatId)?.emoji ?? null;
  const xpPct = (sage.xp / sage.xp_to_next) * 100;

  function promptRename() {
    Alert.prompt?.('Name your chef', 'What should we call your companion?', (name) => {
      if (name?.trim()) rename.mutate(name.trim());
    });
  }

  function giveTreat() {
    treat.mutate(undefined, {
      onError: (e) => {
        if (e instanceof ApiError && e.status === 402) {
          Alert.alert('Out of credits', 'Get more credits to treat Sage.', [
            { text: 'Not now' },
            { text: 'Get credits', onPress: () => router.push('/wallet') },
          ]);
        }
      },
    });
  }

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
        <SageAvatar moodEmoji={sage.mood_emoji} hatEmoji={hatEmoji} dormant={sage.is_dormant} />
        <Text variant="heading" onPress={promptRename}>
          {sage.name} ✎
        </Text>
        <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
          {sage.message}
        </Text>
      </View>

      <Card style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" tone="muted">Vitality · {sage.mood}</Text>
            <Text variant="caption" tone="muted">{sage.vitality}/100</Text>
          </View>
          <Bar value={sage.vitality} color={barColor(sage.state, theme)} track={theme.colors.surface} />
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" tone="muted">Level {sage.level}</Text>
            <Text variant="caption" tone="muted">{sage.xp}/{sage.xp_to_next} XP</Text>
          </View>
          <Bar value={xpPct} color={theme.colors.primary} track={theme.colors.surface} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Text variant="title">🔥 {sage.streak_days}</Text>
            <Text variant="caption" tone="muted">day streak</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text variant="title">💛 {sage.bond_level}</Text>
            <Text variant="caption" tone="muted">bond</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text variant="title">🏆 {sage.longest_streak}</Text>
            <Text variant="caption" tone="muted">best streak</Text>
          </View>
        </View>
      </Card>

      <Button
        title={sage.is_dormant ? 'Cook to revive Sage! 🍳' : 'Cook now — feed Sage 🍳'}
        onPress={() => router.navigate('/cook')}
      />
      <Button title="Give a treat (40 credits) 🍬" variant="secondary" loading={treat.isPending} onPress={giveTreat} />
      <Button title="Sage's closet 🎩" variant="ghost" onPress={() => router.push('/shop')} />
    </Screen>
  );
}
