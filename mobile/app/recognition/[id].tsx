/** Detected-foods results — category-colored, then jump into chat. */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { Button, Card, FadeInUp, Screen, Text } from '../../src/components/ui';
import { categoryColors, useTheme } from '../../src/theme';
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
        {result.foods.map((f, i) => {
          const cat = categoryColors[f.category?.toLowerCase()] ?? categoryColors.other;
          return (
            <FadeInUp key={`${f.name}-${i}`} index={i}>
              <Card style={{ paddingVertical: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 }}>
                    <View style={{ width: 10, height: 40, borderRadius: 5, backgroundColor: cat.fg }} />
                    <View style={{ flex: 1 }}>
                      <Text variant="title" numberOfLines={1}>{f.name}</Text>
                      <View
                        style={{
                          alignSelf: 'flex-start',
                          backgroundColor: cat.bg,
                          borderRadius: theme.radius.pill,
                          paddingVertical: 2,
                          paddingHorizontal: theme.spacing.sm,
                          marginTop: 3,
                        }}
                      >
                        <Text variant="overline" style={{ color: cat.fg }}>
                          {f.category.toUpperCase()}
                          {f.estimated_quantity ? ` · ${f.estimated_quantity}` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text variant="caption" tone="subtle">{Math.round(f.confidence * 100)}%</Text>
                </View>
              </Card>
            </FadeInUp>
          );
        })}
      </View>

      <Button
        title="What can I make?"
        icon="sparkles"
        style={{ marginTop: theme.spacing.md }}
        onPress={() => router.push(`/chat/${result.id}`)}
      />
    </Screen>
  );
}
