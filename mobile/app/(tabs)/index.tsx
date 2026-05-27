/** Sage home — data container. Fetches Sage + handles all mutations, then renders the selected
 *  layout *variant* (see src/features/sage/variants/). A dev-only pill cycles variants on-device
 *  so designs can be compared live without losing the current one. */
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { EmptyState, Icon, type IconName, Screen, Text } from '../../src/components/ui';
import { scheduleHungerReminder } from '../../src/features/sage/notifications';
import { TREAT_COST, useCosmetics, useSage } from '../../src/features/sage/useSage';
import { SAGE_VARIANTS } from '../../src/features/sage/variants';
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

  // Which layout variant is showing (dev-only switcher cycles this).
  const [variantIdx, setVariantIdx] = useState(0);

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

  const variant = SAGE_VARIANTS[variantIdx];
  const Variant = variant.Component;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Variant
        sage={sage}
        moodColor={mood}
        xpPct={xpPct}
        accessoryIcon={accessoryIcon}
        themeColor={themeColor}
        treatPending={treat.isPending}
        onCookNow={() => router.navigate('/cook')}
        onTreat={giveTreat}
        onRename={promptRename}
        onShop={() => router.push('/shop')}
      />

      {/* Dev-only layout switcher — tap to cycle variants live. Stripped from production builds. */}
      {__DEV__ ? (
        <Pressable
          onPress={() => {
            haptic.light();
            setVariantIdx((i) => (i + 1) % SAGE_VARIANTS.length);
          }}
          style={{
            position: 'absolute',
            top: theme.spacing.sm,
            right: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            backgroundColor: theme.colors.text,
            opacity: 0.82,
            paddingVertical: 6,
            paddingHorizontal: theme.spacing.sm + 2,
            borderRadius: theme.radius.pill,
            ...theme.shadow.card,
          }}
        >
          <Icon name="sparkles" color={theme.colors.background} size="sm" />
          <Text variant="caption" style={{ color: theme.colors.background }}>
            {variant.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
