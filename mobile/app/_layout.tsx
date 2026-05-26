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
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { queryClient } from '../src/lib/queryClient';
import { ThemeProvider, palette, useTheme } from '../src/theme';
import { initAuthListener, useAuth } from '../src/store/auth';

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
    <SafeAreaProvider initialMetrics={initialWindowMetrics} style={{ flex: 1, backgroundColor: palette.neutral.cream }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <StatusBar style="auto" />
          {fontsLoaded ? <Navigator /> : <FontGate />}
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/** Cream loading screen while fonts load (avoids a flash of fallback type). */
function FontGate() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
