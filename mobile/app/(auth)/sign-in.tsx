/** Sign in / sign up — the first impression. Warm, editorial, premium. */
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { Button, Icon, Input, Screen, Text } from '../../src/components/ui';
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.xl }}>
          {/* Wordmark */}
          <View style={{ gap: theme.spacing.sm }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.primarySoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: theme.spacing.xs,
              }}
            >
              <Icon name="chef-hat" tone="primary" size="lg" />
            </View>
            <Text variant="hero">Sage AI</Text>
            <Text variant="title" tone="primary">Your personal chef</Text>
            <Text variant="body" tone="muted" style={{ maxWidth: 300, marginTop: theme.spacing.xs }}>
              Snap your ingredients and Sage turns them into the most amazing meal you've ever made.
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: theme.spacing.md }}>
            <Input
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
            />
            <Button
              title={mode === 'signin' ? 'Sign in' : 'Create account'}
              loading={loading}
              onPress={submit}
              style={{ marginTop: theme.spacing.xs }}
            />
            <Button
              title={mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
              variant="ghost"
              onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
