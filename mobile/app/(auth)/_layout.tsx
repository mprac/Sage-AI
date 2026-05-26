import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '../../src/store/auth';

/** Unauthenticated stack — bounce to the app if already signed in. */
export default function AuthLayout() {
  const session = useAuth((s) => s.session);
  if (session) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
