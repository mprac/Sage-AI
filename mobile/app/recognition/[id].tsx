/** Detected-foods results — review what the AI found, then jump into chat. */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '../../src/components/ui';
import { useTheme } from '../../src/theme';
import { useRecognitions } from '../../src/store/recognition';

export default function RecognitionResultScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const result = useRecognitions((s) => (id ? s.byId[id] : undefined));

  if (!result) {
    return (
      <Screen>
        <Text tone="muted">That result expired. Snap a new photo to try again.</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="heading">I spotted {result.foods.length} items</Text>
      <Text variant="body" tone="muted">Here's what you have on hand:</Text>

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
        {result.foods.map((f, i) => (
          <Card key={`${f.name}-${i}`} style={{ paddingVertical: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text variant="title">{f.name}</Text>
                <Text variant="caption" tone="muted">
                  {f.category}
                  {f.estimated_quantity ? ` · ${f.estimated_quantity}` : ''}
                </Text>
              </View>
              <Text variant="caption" tone="muted">{Math.round(f.confidence * 100)}%</Text>
            </View>
          </Card>
        ))}
      </View>

      <Button
        title="What can I make? 🍽️"
        style={{ marginTop: theme.spacing.md }}
        onPress={() => router.push(`/chat/${result.id}`)}
      />
    </Screen>
  );
}
