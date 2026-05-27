/** Profile — shows the personal-chef taste profile the AI has learned + sign out. */
import React from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '../../src/components/ui';
import { useProfile } from '../../src/features/profile/useProfile';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme';

function Chips({ label, items }: { label: string; items: string[] }) {
  const theme = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="caption" tone="muted">{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
        {items.map((it) => (
          <View
            key={it}
            style={{
              backgroundColor: theme.colors.accentSoft,
              paddingVertical: 4,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.radius.pill,
            }}
          >
            <Text variant="caption" tone="primary">{it}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Profile() {
  const theme = useTheme();
  const { data, isLoading } = useProfile();

  return (
    <Screen scroll>
      <Text variant="heading">Your taste profile</Text>
      <Text variant="body" tone="muted">
        Your chef learns what you like as you chat. The more you cook, the better the suggestions.
      </Text>

      <Card style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
        {isLoading || !data ? (
          <Text tone="muted">Loading…</Text>
        ) : (
          <>
            <Chips label="Likes" items={data.likes} />
            <Chips label="Dislikes" items={data.dislikes} />
            <Chips label="Allergies" items={data.allergies} />
            <Chips label="Dietary" items={data.dietary_restrictions} />
            <Chips label="Favourite cuisines" items={data.favorite_cuisines} />
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

      <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
    </Screen>
  );
}
