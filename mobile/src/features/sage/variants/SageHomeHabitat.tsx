/**
 * Sage home — "Habitat": a fixed (no-scroll) editorial layout built around a *horizontal* companion
 * card (avatar left, vitals right) instead of the centered column the other variants use. A HUD bar
 * pins level + mood to the top; a segmented stat strip and a circular action dock anchor the bottom.
 * Everything is sized with flex so it fits one screen on any device — no scrolling, ever.
 */
import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, View } from 'react-native';

import { Badge, Card, Gradient, Icon, type IconName, Screen, Text } from '../../../components/ui';
import { haptic } from '../../../lib/haptics';
import { useTheme } from '../../../theme';
import { HarvestMeter } from '../HarvestMeter';
import { SageAvatar } from '../SageAvatar';
import { Bar, iconTint, moodGradient, type SageVariantProps } from './shared';

/** A circular tappable icon button — the secondary actions in the dock (treat / closet). */
function Orb({
  icon,
  tint,
  loading,
  onPress,
}: {
  icon: IconName;
  tint: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          haptic.light();
          onPress();
        }}
        onPressIn={() => animate(0.92)}
        onPressOut={() => animate(1)}
        disabled={loading}
        style={[
          {
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          },
          theme.shadow.sm,
        ]}
      >
        {loading ? <ActivityIndicator color={tint} /> : <Icon name={icon} color={tint} size="md" />}
      </Pressable>
    </Animated.View>
  );
}

/** One segment of the stat strip — a horizontal icon + value + label, divided by hairlines. */
function Seg({ icon, value, label, color }: { icon: IconName; value: number; label: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
      <Icon name={icon} color={color ?? iconTint(icon, theme) ?? theme.colors.primary} size="sm" />
      <Text variant="heading">{value}</Text>
      <Text variant="overline" tone="muted">{label}</Text>
    </View>
  );
}

/** A labeled progress track (vitality / XP) with a right-aligned readout. */
function Track({ label, readout, value, color, colors, theme }: {
  label: string;
  readout: string;
  value: number;
  color?: string;
  colors?: readonly string[];
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="overline" tone="muted">{label}</Text>
        <Text variant="caption" tone="muted">{readout}</Text>
      </View>
      <Bar value={value} color={color} colors={colors} track={theme.colors.surface} />
    </View>
  );
}

export function SageHomeHabitat({
  sage,
  moodColor,
  xpPct,
  accessoryIcon,
  themeColor,
  treatPending,
  nextReward,
  season,
  onCookNow,
  onTreat,
  onRename,
  onShop,
  onOpenAlmanac,
}: SageVariantProps) {
  const theme = useTheme();
  const cookScale = useRef(new Animated.Value(1)).current;
  const animateCook = (to: number) =>
    Animated.spring(cookScale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  const seasonPalette = season ? theme.seasonPalette[season.season] : null;

  return (
    <Screen edges={['top']} tabBarSpacing>
      <View style={{ flex: 1 }}>
        {/* ── HUD: level pill + season chip (left) + mood (right) ─────────────── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs + 2 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: theme.colors.primarySoft,
                paddingVertical: 5,
                paddingHorizontal: theme.spacing.sm + 2,
                borderRadius: theme.radius.pill,
              }}
            >
              <Icon name="crown" tone="primary" size="sm" />
              <Text variant="overline" tone="primary">LEVEL {sage.level}</Text>
            </View>
            {season && seasonPalette ? (
              <Pressable
                onPress={() => {
                  haptic.light();
                  onOpenAlmanac();
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: seasonPalette.wash[0],
                  paddingVertical: 5,
                  paddingHorizontal: theme.spacing.sm + 2,
                  borderRadius: theme.radius.pill,
                }}
              >
                <Icon name={seasonPalette.icon as IconName} color={seasonPalette.ring[0]} size="sm" />
                <Text variant="overline" style={{ color: seasonPalette.ring[0] }}>
                  {seasonPalette.label.toUpperCase()}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Badge label={sage.mood} fg={moodColor} bg={theme.colors.card} />
        </View>

        {/* ── Companion card: avatar (left) + name & vital tracks (right) ──────── */}
        <Card
          variant="elevated"
          style={{ marginTop: theme.spacing.md, overflow: 'hidden', gap: theme.spacing.md }}
        >
          {/* A whisper of brand tint on the avatar's side, full-bleed so it dissolves seamlessly
              into the card (fades to the card's own colour) — a calm wash, never a clipped blob.
              The avatar's own soft ring-glow supplies the radial bloom on top of this. */}
          <Gradient
            colors={[theme.colors.primarySoft, `${theme.colors.card}00`]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.62, y: 0.5 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <SageAvatar
              vitality={sage.vitality}
              moodColor={moodColor}
              themeColor={themeColor}
              accessoryIcon={accessoryIcon}
              dormant={sage.is_dormant}
              size={118}
            />
            <View style={{ flex: 1, gap: theme.spacing.sm }}>
              <Pressable
                onPress={onRename}
                style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}
              >
                <Text variant="display" numberOfLines={1} style={{ flexShrink: 1 }}>{sage.name}</Text>
                <Icon name="pencil" tone="muted" size="sm" />
              </Pressable>
              <Track
                label="Vitality"
                readout={`${sage.vitality}/100`}
                value={sage.vitality}
                colors={moodGradient(sage.state, theme)}
                theme={theme}
              />
              <Track
                label="Next level"
                readout={`${sage.xp}/${sage.xp_to_next} XP`}
                value={xpPct}
                colors={[theme.colors.primary, theme.colors.accent, theme.colors.energy]}
                theme={theme}
              />
            </View>
          </View>

          {/* Sage's message as an inline quote, hairline-separated from the vitals. */}
          <View style={{ height: 1, backgroundColor: theme.colors.divider }} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
            <Icon name="sparkles" tone="primary" size="sm" />
            <Text numberOfLines={2} style={{ flex: 1, fontStyle: 'italic', lineHeight: 22 }}>
              {sage.message}
            </Text>
          </View>
        </Card>

        {/* ── Segmented stat strip ─────────────────────────────────────────────── */}
        <Card style={{ marginTop: theme.spacing.md, flexDirection: 'row', alignItems: 'center' }}>
          <Seg icon="flame" value={sage.streak_days} label="streak" />
          <View style={{ width: 1, height: 40, backgroundColor: theme.colors.divider }} />
          <Seg icon="heart" value={sage.bond_level} label="bond" />
          <View style={{ width: 1, height: 40, backgroundColor: theme.colors.divider }} />
          <Seg icon="trophy" value={sage.longest_streak} label="best" />
          {season ? (
            <>
              <View style={{ width: 1, height: 40, backgroundColor: theme.colors.divider }} />
              <Pressable
                onPress={() => {
                  haptic.light();
                  onOpenAlmanac();
                }}
                style={{ flex: 1, alignItems: 'center', gap: 3 }}
              >
                <HarvestMeter
                  cooked={season.harvest.cooked.length}
                  total={season.harvest.total}
                  season={season.season}
                  size={28}
                  strokeWidth={3}
                />
                <Text variant="heading">
                  {season.harvest.cooked.length}/{season.harvest.total}
                </Text>
                <Text variant="overline" tone="muted">harvest</Text>
              </Pressable>
            </>
          ) : null}
        </Card>

        {/* ── Goal: the reward you're cooking toward — turns the gap into the heart of the loop.
            Centered in the flexible space so the dock stays anchored to the bottom on any screen. */}
        <View style={{ flex: 1, justifyContent: 'flex-start', marginTop: theme.spacing.md }}>
          {nextReward ? (
            <Pressable onPress={onShop}>
              <Card variant="elevated" style={{ gap: theme.spacing.sm + 2, padding: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: theme.colors.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="crown" color={theme.colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="overline" tone="muted">COOKING TOWARD</Text>
                    <Text variant="title" numberOfLines={1}>{nextReward.name}</Text>
                  </View>
                  <Badge label={`LV ${nextReward.unlockLevel}`} />
                </View>
                <Bar
                  value={xpPct}
                  colors={[theme.colors.primary, theme.colors.accent, theme.colors.energy]}
                  track={theme.colors.surface}
                />
              </Card>
            </Pressable>
          ) : (
            <Pressable onPress={onCookNow}>
              <Card variant="elevated" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.colors.energySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="flame" color={theme.colors.energy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="title">
                    {sage.streak_days > 0 ? `${sage.streak_days}-day streak` : 'Start a streak'}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {sage.streak_days > 0
                      ? `Cook today to keep ${sage.name} glowing`
                      : `Cook today to begin ${sage.name}'s journey`}
                  </Text>
                </View>
                <Icon name="arrow-right" tone="muted" size="sm" />
              </Card>
            </Pressable>
          )}
        </View>

        {/* ── Action dock: dominant CTA + circular treat / closet orbs ─────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Animated.View style={{ flex: 1, transform: [{ scale: cookScale }] }}>
            <Pressable
              onPress={() => {
                haptic.light();
                onCookNow();
              }}
              onPressIn={() => animateCook(0.97)}
              onPressOut={() => animateCook(1)}
            >
              <Gradient
                name="brand"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing.sm,
                    paddingVertical: 18,
                    borderRadius: theme.radius.lg,
                  },
                  theme.shadow.glow,
                ]}
              >
                <Icon name="camera" tone="onPrimary" size="md" />
                <Text variant="label" tone="onPrimary">
                  {sage.is_dormant ? `Revive ${sage.name}` : `Cook — feed ${sage.name}`}
                </Text>
              </Gradient>
            </Pressable>
          </Animated.View>
          <Orb icon="gem" tint={theme.colors.accent} loading={treatPending} onPress={onTreat} />
          <Orb icon="shopping-bag" tint={theme.colors.primary} onPress={onShop} />
        </View>
      </View>
    </Screen>
  );
}
