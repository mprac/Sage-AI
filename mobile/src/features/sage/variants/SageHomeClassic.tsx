/** Sage home — "Classic": fixed (no-scroll) layout, solid background, hero + stats card + actions. */
import React from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Icon, Screen, Text } from '../../../components/ui';
import { useTheme } from '../../../theme';
import { SageAvatar } from '../SageAvatar';
import { TREAT_COST } from '../useSage';
import { Bar, type SageVariantProps, Stat } from './shared';

export function SageHomeClassic({
  sage,
  moodColor,
  xpPct,
  accessoryIcon,
  themeColor,
  treatPending,
  onCookNow,
  onTreat,
  onRename,
  onShop,
}: SageVariantProps) {
  const theme = useTheme();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        {/* Hero (no gradient, solid background) */}
        <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.spacing.sm }}>
          <SageAvatar
            vitality={sage.vitality}
            moodColor={moodColor}
            themeColor={themeColor}
            accessoryIcon={accessoryIcon}
            dormant={sage.is_dormant}
          />
          <Pressable
            onPress={onRename}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}
          >
            <Text variant="display">{sage.name}</Text>
            <Icon name="pencil" tone="muted" size="sm" />
          </Pressable>
          <Badge label={sage.mood} fg={moodColor} bg={theme.colors.surface} />
          <Text tone="text" style={{ textAlign: 'center', maxWidth: 320, fontSize: 20, lineHeight: 32, marginBottom: theme.spacing.sm }}>
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
            <Bar value={sage.vitality} color={moodColor} track={theme.colors.surface} />
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
            onPress={onCookNow}
          />
          <Button title={`Give a treat (${TREAT_COST} credits)`} variant="secondary" icon="gem" loading={treatPending} onPress={onTreat} />
          <Button title={`${sage.name}'s closet`} variant="ghost" icon="shopping-bag" onPress={onShop} />
        </View>
      </View>
    </Screen>
  );
}
