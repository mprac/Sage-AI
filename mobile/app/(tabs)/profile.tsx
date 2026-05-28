/** Profile — shows the personal-chef taste profile the AI has learned + sign out. */
import React from 'react';
import { Pressable, View } from 'react-native';

import { Button, Card, Icon, Screen, Text } from '../../src/components/ui';
import { useProfile } from '../../src/features/profile/useProfile';
import { useSetHemisphere } from '../../src/features/sage/useSeason';
import { haptic } from '../../src/lib/haptics';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme';
import type { Hemisphere } from '../../src/types/api';

/** Each taste group carries its own meaningful colour — green = likes, amber = cuisines, coral =
 *  dietary, red = allergies — so the profile reads as a vivid, scannable palette of you. */
function Chips({ label, items, bg, fg }: { label: string; items: string[]; bg: string; fg: string }) {
  const theme = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="overline" tone="muted">{label.toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
        {items.map((it) => (
          <View
            key={it}
            style={{
              backgroundColor: bg,
              paddingVertical: 5,
              paddingHorizontal: theme.spacing.sm + 2,
              borderRadius: theme.radius.pill,
            }}
          >
            <Text variant="caption" style={{ color: fg }}>{it}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HemisphereCard({ value }: { value: Hemisphere }) {
  const theme = useTheme();
  const setHemisphere = useSetHemisphere();
  const choose = (h: Hemisphere) => {
    if (h === value) return;
    haptic.light();
    setHemisphere.mutate(h);
  };
  const Option = ({ h, label, sub }: { h: Hemisphere; label: string; sub: string }) => {
    const active = h === value;
    return (
      <Pressable
        onPress={() => choose(h)}
        style={{
          flex: 1,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor: active ? theme.colors.primary : theme.colors.border,
          backgroundColor: active ? theme.colors.primarySoft : theme.colors.card,
          gap: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Icon name={active ? 'check' : 'sun'} tone={active ? 'primary' : 'muted'} size="sm" />
          <Text variant="title" tone={active ? 'primary' : 'text'}>{label}</Text>
        </View>
        <Text variant="caption" tone="muted">{sub}</Text>
      </Pressable>
    );
  };
  return (
    <Card style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
      <View style={{ gap: 2 }}>
        <Text variant="overline" tone="muted">REGION</Text>
        <Text variant="title">What's your hemisphere?</Text>
        <Text variant="caption" tone="muted">
          Sage's seasonal calendar follows your hemisphere.
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <Option h="N" label="Northern" sub="USA, Europe, Asia" />
        <Option h="S" label="Southern" sub="Australia, S. America" />
      </View>
    </Card>
  );
}

export default function Profile() {
  const theme = useTheme();
  const { data, isLoading } = useProfile();

  return (
    <Screen scroll tabBarSpacing>
      <Text variant="heading">Your taste profile</Text>
      <Text variant="body" tone="muted">
        Your chef learns what you like as you chat. The more you cook, the better the suggestions.
      </Text>

      <Card style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
        {isLoading || !data ? (
          <Text tone="muted">Loading…</Text>
        ) : (
          <>
            <Chips label="Likes" items={data.likes} bg={theme.colors.primarySoft} fg={theme.colors.primary} />
            <Chips label="Dislikes" items={data.dislikes} bg={theme.colors.surface} fg={theme.colors.muted} />
            <Chips label="Allergies" items={data.allergies} bg={theme.colors.dangerSoft} fg={theme.colors.danger} />
            <Chips label="Dietary" items={data.dietary_restrictions} bg={theme.colors.energySoft} fg={theme.colors.energy} />
            <Chips label="Favourite cuisines" items={data.favorite_cuisines} bg={theme.colors.accentSoft} fg={theme.colors.accent} />
            {data.memory_summary ? (
              <View style={{ gap: theme.spacing.xs }}>
                <Text variant="caption" tone="muted">What I remember</Text>
                <Text variant="body">{data.memory_summary}</Text>
              </View>
            ) : null}
            {!data.likes.length && !data.dislikes.length && !data.memory_summary ? (
              <Text tone="muted">Nothing learned yet — start a chat to teach me your tastes!</Text>
            ) : null}
          </>
        )}
      </Card>

      {data ? <HemisphereCard value={data.hemisphere} /> : null}

      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
