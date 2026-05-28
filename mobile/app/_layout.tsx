/** Root layout: fonts + providers (theme, query, safe-area) + auth bootstrap + navigation theming. */
import { Fraunces_500Medium, Fraunces_600SemiBold, useFonts } from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  ThemeProvider as NavThemeProvider,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { BrandSplash } from '../src/components/BrandSplash';
import { SnackbarHost } from '../src/components/ui';
import { queryClient } from '../src/lib/queryClient';
import { ThemeProvider, palette, useTheme } from '../src/theme';
import { initAuthListener, useAuth } from '../src/store/auth';

// Hold the native splash until our fonts are ready, then hand off to the animated BrandSplash.
SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const theme = useTheme();
  const ready = useAuth((s) => s.ready);

  // Match React Navigation's theme to ours so screen transitions never flash white.
  const navTheme = useMemo<NavTheme>(() => {
    const base = theme.mode === 'dark' ? NavDarkTheme : NavDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.background,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.primary,
      },
    };
  }, [theme]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  // Shared header styling: clean, no shadow line, serif title, arrow-only back button.
  return (
    <NavThemeProvider value={navTheme}>
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTintColor: theme.colors.primary,
        headerTitleStyle: { fontFamily: theme.fonts.semibold, color: theme.colors.title, fontSize: 17 },
        headerBackButtonDisplayMode: 'minimal', // arrow only — no "(tabs)" / route-name text
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="recognition/[id]" options={{ headerShown: true, title: 'What you have' }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Chat' }} />
      <Stack.Screen name="recipe/[id]" options={{ headerShown: true, title: 'Recipe' }} />
      <Stack.Screen name="cook-mode/[id]" options={{ headerShown: true, title: 'Cook Mode' }} />
      <Stack.Screen name="wallet" options={{ headerShown: true, title: 'Credits', presentation: 'modal' }} />
      <Stack.Screen name="shop" options={{ headerShown: true, title: 'Closet' }} />
      <Stack.Screen name="almanac" options={{ headerShown: true, title: 'Almanac' }} />
    </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => initAuthListener(), []);
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics} style={{ flex: 1, backgroundColor: palette.neutral.cream }}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <StatusBar style="auto" />
            <AppShell fontsLoaded={fontsLoaded} />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Holds the app behind the native splash until fonts load, then overlays the animated BrandSplash
 *  until the app is ready + a minimum dwell has passed. */
function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const authReady = useAuth((s) => s.ready);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null; // native splash stays up until fonts are ready

  return (
    <View style={{ flex: 1 }}>
      <Navigator />
      <SnackbarHost />
      {!splashDone ? <BrandSplash ready={authReady} onFinish={() => setSplashDone(true)} /> : null}
    </View>
  );
}
