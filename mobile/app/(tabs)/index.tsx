/** Sage home — data container. Fetches Sage + handles all mutations, then renders the Habitat layout. */
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { EmptyState, type IconName, Screen } from '../../src/components/ui';
import { scheduleHungerReminder } from '../../src/features/sage/notifications';
import { TREAT_COST, useCosmetics, useSage } from '../../src/features/sage/useSage';
import { useSeason } from '../../src/features/sage/useSeason';
import { SageHomeHabitat } from '../../src/features/sage/variants';
import { moodColor } from '../../src/features/sage/variants/shared';
import { ApiError } from '../../src/lib/api';
import { haptic } from '../../src/lib/haptics';
import { useTheme } from '../../src/theme';
import type { Cosmetic } from '../../src/types/api';

export default function SageHome() {
  const theme = useTheme();
  const router = useRouter();
  const { data: sage, isLoading, isError, refetch, treat, rename } = useSage();
  const { data: cosmetics } = useCosmetics();
  const { data: season } = useSeason();

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

  // The next cosmetic unlocked by leveling — a tangible goal to cook toward (drives the loop).
  const nextReward = (() => {
    const upcoming = (cosmetics ?? [])
      .filter((c: Cosmetic) => c.unlock_level > sage.level)
      .sort((a: Cosmetic, b: Cosmetic) => a.unlock_level - b.unlock_level)[0];
    return upcoming ? { name: upcoming.name, unlockLevel: upcoming.unlock_level } : null;
  })();

  function promptRename() {
    Alert.prompt?.('Name your chef', 'What should we call your companion?', (name) => {
      if (name?.trim()) rename.mutate(name.trim());
    });
  }

  function giveTreat() {
    haptic.light();
    // Confirm the spend before charging — treats cost credits, so never deduct silently.
    Alert.alert(
      `Treat ${sage!.name}?`,
      `This costs ${TREAT_COST} credits and gives ${sage!.name} a little vitality boost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Spend ${TREAT_COST}`,
          onPress: () => {
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
          },
        },
      ],
    );
  }

  return (
    <SageHomeHabitat
      sage={sage}
      moodColor={mood}
      xpPct={xpPct}
      accessoryIcon={accessoryIcon}
      themeColor={themeColor}
      treatPending={treat.isPending}
      nextReward={nextReward}
      season={season ?? null}
      onCookNow={() => router.navigate('/cook')}
      onTreat={giveTreat}
      onRename={promptRename}
      onShop={() => router.push('/shop')}
      onOpenAlmanac={() => router.push('/almanac')}
    />
  );
}
