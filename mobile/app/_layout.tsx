/** Root layout: providers (theme, query, safe-area) + auth bootstrap. */
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '../src/lib/queryClient';
import { ThemeProvider, useTheme } from '../src/theme';
import { initAuthListener, useAuth } from '../src/store/auth';

function Navigator() {
  const theme = useTheme();
  const ready = useAuth((s) => s.ready);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  // Group layouts ((auth) / (tabs)) handle redirect based on session.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="recognition/[id]" options={{ headerShown: true, title: 'What you have' }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Sage' }} />
      <Stack.Screen name="wallet" options={{ headerShown: true, title: 'Credits', presentation: 'modal' }} />
      <Stack.Screen name="shop" options={{ headerShown: true, title: "Sage's closet" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => initAuthListener(), []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <StatusBar style="auto" />
          <Navigator />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
