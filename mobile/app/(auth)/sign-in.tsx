/** Sign in / sign up with email. (Social providers can be added via supabase.auth.signInWithOAuth.) */
import React, { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Input, Screen, Text } from '../../src/components/ui';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/theme';

export default function SignIn() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const fn = mode === 'signin' ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { error } = await fn({ email: email.trim(), password });
      if (error) Alert.alert('Oops', error.message);
      else if (mode === 'signup') {
        Alert.alert('Almost there', 'Check your email to confirm your account, then sign in.');
        setMode('signin');
      }
      // On success the auth listener flips the session and the router redirects automatically.
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="display">🌿 Sage</Text>
          <Text variant="body" tone="muted">
            Your personal AI chef. Snap your ingredients and Sage tells you what to cook.
          </Text>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
          <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
          <Button title={mode === 'signin' ? 'Sign in' : 'Create account'} loading={loading} onPress={submit} />
          <Button
            title={mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
            variant="ghost"
            onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
          />
        </View>
      </View>
    </Screen>
  );
}
