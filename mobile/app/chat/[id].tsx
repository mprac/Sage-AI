/** Streaming chat with the personal chef — token-by-token via SSE. */
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Input, Screen, Text } from '../../src/components/ui';
import { useChatStream } from '../../src/features/chat/useChatStream';
import { useSage } from '../../src/features/sage/useSage';
import { useTheme } from '../../src/theme';

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const theme = useTheme();
  const mine = role === 'user';
  return (
    <View
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        backgroundColor: mine ? theme.colors.primary : theme.colors.card,
        borderColor: theme.colors.border,
        borderWidth: mine ? 0 : 1,
        borderRadius: theme.radius.lg,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.sm,
      }}
    >
      <Text tone={mine ? 'onPrimary' : 'text'}>{content || '…'}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { messages, streaming, error, send, sessionId } = useChatStream();
  const { feed } = useSage();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const started = useRef(false);

  function markCooked() {
    feed.mutate('cook', {
      onSuccess: (res) => {
        const lines = ['Yum! Sage is full and happy. 🍽️'];
        if (res.revived) lines.push('You brought Sage back to life! 💛');
        if (res.leveled_up) lines.push(`Sage leveled up to ${res.pet.level}! 🎉`);
        Alert.alert('Fed Sage', lines.join('\n'));
      },
    });
  }

  // Kick off with an opening question seeded by the detected ingredients.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    send({ message: 'What can I make with these ingredients?', sessionId: null, recognitionId: id });
  }, [id, send]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  function submit() {
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft('');
    send({ message: text, sessionId: sessionId.current });
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} content={m.content} />
          ))}
          {error ? (
            <Text tone="danger" variant="caption">
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <Pressable
          onPress={markCooked}
          disabled={feed.isPending}
          style={{
            alignSelf: 'center',
            backgroundColor: theme.colors.accentSoft,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radius.pill,
            marginBottom: theme.spacing.sm,
            opacity: feed.isPending ? 0.5 : 1,
          }}
        >
          <Text variant="caption" tone="primary">
            🍽️ I cooked this — feed Sage
          </Text>
        </Pressable>

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.sm,
            padding: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          }}
        >
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Ask for a recipe…"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              returnKeyType="send"
              editable={!streaming}
            />
          </View>
          <Pressable
            onPress={submit}
            disabled={streaming || !draft.trim()}
            style={{
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.lg,
              justifyContent: 'center',
              opacity: streaming || !draft.trim() ? 0.5 : 1,
            }}
          >
            <Text tone="onPrimary" variant="title">
              ➤
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
