/** Capture screen — take/pick a photo of your food → recognize → results.
 *  Also surfaces a "Your kitchen" card below the camera when an in-progress
 *  recognition exists, so the user can resume editing instead of starting over. */
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';

import { Button, Card, Gradient, Icon, Screen, Text } from '../../src/components/ui';
import { useRecognition } from '../../src/features/recognition/useRecognition';
import { ApiError, api } from '../../src/lib/api';
import { useTheme } from '../../src/theme';
import { useRecognitions } from '../../src/store/recognition';
import { useWallet } from '../../src/store/wallet';
import type { RecognitionResult } from '../../src/types/api';

export default function Cook() {
  const theme = useTheme();
  const router = useRouter();
  const saveRecognition = useRecognitions((s) => s.save);
  const activeId = useRecognitions((s) => s.activeId);
  const setBalance = useWallet((s) => s.setBalance);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Resume-card data — hydrates from cache instantly, falls through to the GET endpoint on
  // cold-start. The card only renders when both activeId and a valid recognition are present.
  const active = useRecognition(activeId);

  async function pick(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to continue.');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setPreview(uri);
    setBusy(true);
    try {
      const rec = await api.recognize<RecognitionResult>(uri);
      saveRecognition(rec);
      setBalance(rec.balance);
      router.push(`/recognition/${rec.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        Alert.alert('Out of credits', 'Top up to keep cooking with Sage.', [
          { text: 'Not now' },
          { text: 'Get credits', onPress: () => router.push('/wallet') },
        ]);
      } else {
        Alert.alert('Hmm', "Couldn't read that photo. Try another shot.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll tabBarSpacing>
      <Text variant="heading">What's in your kitchen?</Text>
      <Text variant="body" tone="muted">
        Snap a photo of your ingredients and Sage will suggest what to cook.
      </Text>

      <Card style={{ alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
        {preview ? (
          <Image source={{ uri: preview }} style={{ width: '100%', height: 220, borderRadius: theme.radius.md }} />
        ) : (
          <View
            style={{
              width: '100%',
              height: 220,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.primarySoft,
              borderWidth: 1.5,
              borderColor: theme.colors.primary,
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.md,
            }}
          >
            <Gradient
              name="brand"
              style={[
                { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
                theme.shadow.glow,
              ]}
            >
              <Icon name="camera" size="lg" tone="onPrimary" />
            </Gradient>
            <Text variant="title" tone="primary">Snap your ingredients</Text>
          </View>
        )}
        <Button title="Take a photo" loading={busy} onPress={() => pick(true)} />
        <Button title="Choose from library" variant="secondary" disabled={busy} onPress={() => pick(false)} />
      </Card>

      {/* "Your kitchen" — resume the in-progress ingredient list. Hidden when there isn't one
          so the camera card stays the visual focus for a fresh user. */}
      {activeId && active.data ? (
        <Card variant="elevated" style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
          <Text variant="overline" tone="muted">YOUR KITCHEN</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
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
              <Icon name="utensils" tone="primary" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="title" numberOfLines={1}>
                {active.data.foods.length} ingredient{active.data.foods.length === 1 ? '' : 's'}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {active.data.foods.slice(0, 3).map((f) => f.name).join(', ')}
                {active.data.foods.length > 3 ? '…' : ''}
              </Text>
            </View>
          </View>
          <Button
            title="Continue editing"
            icon="arrow-right"
            onPress={() => router.push(`/recognition/${activeId}`)}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
