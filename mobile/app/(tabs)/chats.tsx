/** Chats tab — your past conversations with Sage. Tap to resume. */
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Card, EmptyState, FadeInUp, Icon, Screen, Text } from '../../src/components/ui';
import { useChats } from '../../src/features/chat/useChats';
import { useTheme } from '../../src/theme';

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
}

export default function Chats() {
  const theme = useTheme();
  const router = useRouter();
  const { data: chats, isLoading } = useChats();

  if (isLoading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!chats || chats.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="message-circle"
          title="No chats yet"
          subtitle="Snap a photo on the Cook tab and ask what you can make to start a conversation."
          actionLabel="Start cooking"
          onAction={() => router.navigate('/cook')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="heading">Your chats</Text>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
        {chats.map((c, i) => (
          <FadeInUp key={c.id} index={i}>
            <Pressable onPress={() => router.push(`/chat/${c.id}?resume=1`)}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: theme.colors.primarySoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="message-circle" tone="primary" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="title" numberOfLines={1}>{c.title}</Text>
                    <Text variant="caption" tone="muted">{relativeDate(c.created_at)}</Text>
                  </View>
                  <Icon name="arrow-right" tone="subtle" size="sm" />
                </View>
              </Card>
            </Pressable>
          </FadeInUp>
        ))}
      </View>
    </Screen>
  );
}
