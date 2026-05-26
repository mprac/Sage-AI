/** Capture screen — take/pick a photo of your food → recognize → results. */
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, View } from 'react-native';

import { Button, Card, Icon, Screen, Text } from '../../src/components/ui';
import { ApiError, api } from '../../src/lib/api';
import { useTheme } from '../../src/theme';
import { useRecognitions } from '../../src/store/recognition';
import { useWallet } from '../../src/store/wallet';
import type { RecognitionResult } from '../../src/types/api';

export default function Cook() {
  const theme = useTheme();
  const router = useRouter();
  const saveRecognition = useRecognitions((s) => s.save);
  const setBalance = useWallet((s) => s.setBalance);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <Screen scroll>
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
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <Icon name="camera" size="xl" tone="muted" />
            <Text tone="muted">No photo yet</Text>
          </View>
        )}
        <Button title="Take a photo" loading={busy} onPress={() => pick(true)} />
        <Button title="Choose from library" variant="secondary" disabled={busy} onPress={() => pick(false)} />
      </Card>
    </Screen>
  );
}
