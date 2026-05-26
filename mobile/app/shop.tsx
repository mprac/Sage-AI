/** Sage's closet — unlock cosmetics by level or buy with credits, then equip. */
import React from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, Screen, Text } from '../src/components/ui';
import { useCosmetics, useSage } from '../src/features/sage/useSage';
import { ApiError } from '../src/lib/api';
import { useTheme } from '../src/theme';
import { useRouter } from 'expo-router';

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

  function act(id: string) {
    buyCosmetic.mutate(id, {
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

  return (
    <Screen scroll>
      <Text variant="heading">Sage's closet 🎩</Text>
      <Text variant="body" tone="muted">Dress up your chef. Unlock by leveling up or with credits.</Text>

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
        {cosmetics.map((c) => {
          const owned = sage.unlocked_cosmetics.includes(c.id);
          const equipped = sage.equipped?.[c.type] === c.id;
          const lockedByLevel = !owned && c.unlock_level > 0 && c.price_credits === 0 && sage.level < c.unlock_level;

          const label = equipped
            ? 'Equipped ✓'
            : owned
              ? 'Equip'
              : lockedByLevel
                ? `Level ${c.unlock_level}`
                : c.price_credits > 0
                  ? `Buy · ${c.price_credits}`
                  : `Unlock (Lvl ${c.unlock_level})`;

          return (
            <Card key={c.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <Text style={{ fontSize: 30 }}>{c.emoji}</Text>
                  <View>
                    <Text variant="title">{c.name}</Text>
                    <Text variant="caption" tone="muted">{c.type}</Text>
                  </View>
                </View>
                <Button
                  title={label}
                  fullWidth={false}
                  variant={equipped ? 'ghost' : 'secondary'}
                  disabled={equipped || lockedByLevel || buyCosmetic.isPending}
                  onPress={() => act(c.id)}
                />
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
