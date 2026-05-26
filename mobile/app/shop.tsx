/** Sage's closet — premium cosmetic tiles (icons + color themes). Unlock by level or credits. */
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Icon, type IconName, Screen, Text } from '../src/components/ui';
import { useCosmetics, useSage } from '../src/features/sage/useSage';
import { ApiError } from '../src/lib/api';
import { haptic } from '../src/lib/haptics';
import { useTheme } from '../src/theme';
import type { Cosmetic } from '../src/types/api';

export default function Shop() {
  const theme = useTheme();
  const router = useRouter();
  const { data: sage, buyCosmetic } = useSage();
  const { data: cosmetics } = useCosmetics();

  if (!sage || !cosmetics) {
    return (
      <Screen>
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  function act(c: Cosmetic) {
    haptic.light();
    buyCosmetic.mutate(c.id, {
      onSuccess: () => haptic.success(),
      onError: (e) => {
        if (e instanceof ApiError && e.status === 402) {
          Alert.alert('Out of credits', 'Get more credits to buy this.', [
            { text: 'Not now' },
            { text: 'Get credits', onPress: () => router.push('/wallet') },
          ]);
        } else if (e instanceof ApiError && e.status === 403) {
          Alert.alert('Locked', (e.body as { detail?: string })?.detail ?? 'Keep leveling up!');
        }
      },
    });
  }

  const sections = ['hat', 'accessory', 'theme'] as const;
  const titles: Record<string, string> = { hat: 'Hats', accessory: 'Accessories', theme: 'Avatar themes' };

  return (
    <Screen scroll>
      <Text variant="heading">Closet</Text>
      <Text variant="body" tone="muted">Dress up your chef. Unlock by leveling up or with credits.</Text>

      {sections.map((section) => {
        const items = cosmetics.filter((c) => c.type === section);
        if (!items.length) return null;
        return (
          <View key={section} style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
            <Text variant="overline" tone="muted">{titles[section].toUpperCase()}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {items.map((c) => (
                <Tile
                  key={c.id}
                  cosmetic={c}
                  owned={sage.unlocked_cosmetics.includes(c.id)}
                  equipped={sage.equipped?.[c.type] === c.id}
                  level={sage.level}
                  busy={buyCosmetic.isPending}
                  onPress={() => act(c)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

function Tile({
  cosmetic: c,
  owned,
  equipped,
  level,
  busy,
  onPress,
}: {
  cosmetic: Cosmetic;
  owned: boolean;
  equipped: boolean;
  level: number;
  busy: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const lockedByLevel = !owned && c.unlock_level > 0 && c.price_credits === 0 && level < c.unlock_level;

  const status = equipped
    ? 'Equipped'
    : owned
      ? 'Equip'
      : lockedByLevel
        ? `Level ${c.unlock_level}`
        : c.price_credits > 0
          ? `${c.price_credits}`
          : `Lvl ${c.unlock_level}`;

  return (
    <Pressable
      onPress={onPress}
      disabled={equipped || lockedByLevel || busy}
      style={{
        width: '31%',
        minWidth: 100,
        aspectRatio: 0.82,
        backgroundColor: theme.colors.card,
        borderWidth: equipped ? 2 : 1,
        borderColor: equipped ? theme.colors.primary : theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        opacity: lockedByLevel ? 0.55 : 1,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: c.type === 'theme' && c.color ? c.color : theme.colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={c.icon as IconName} tone="primary" size="md" />
      </View>
      <Text variant="caption" tone="text" numberOfLines={1} style={{ textAlign: 'center' }}>
        {c.name}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {!owned && c.price_credits > 0 ? <Icon name="coins" tone="primary" size="sm" /> : null}
        {owned && !equipped ? <Icon name="check" tone="success" size="sm" /> : null}
        <Text variant="overline" tone={equipped ? 'primary' : lockedByLevel ? 'subtle' : 'muted'}>
          {status.toUpperCase()}
        </Text>
      </View>
    </Pressable>
  );
}
