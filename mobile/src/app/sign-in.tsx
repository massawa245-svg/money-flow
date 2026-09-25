import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { useSession } from '@/lib/auth-context';

export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    setIsSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (error) setError(error);
  }

  const canSubmit = email.trim().length > 0 && password.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Icon name="wallet" size={28} color={Palette.sand} />
            </View>
            <Text style={styles.title}>Willkommen bei{'\n'}Africa Wallet</Text>
            <Text style={styles.lead}>Senden, empfangen und an der Kasse per QR bezahlen.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label} nativeID="email-label">
                E-Mail
              </Text>
              <TextInput
                accessibilityLabelledBy="email-label"
                style={styles.input}
                placeholder="name@beispiel.com"
                placeholderTextColor={Palette.inkFaint}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label} nativeID="password-label">
                Passwort
              </Text>
              <TextInput
                accessibilityLabelledBy="password-label"
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Palette.inkFaint}
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={canSubmit ? handleSignIn : undefined}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label="Anmelden"
              onPress={handleSignIn}
              disabled={!canSubmit}
              loading={isSubmitting}
              style={styles.submit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: Palette.sand },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32, gap: 32 },
  hero: { gap: 20, alignItems: 'flex-start' },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Palette.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: FontFamily.display, fontSize: 36, lineHeight: 38, color: Palette.ink, letterSpacing: -0.7 },
  lead: { fontFamily: FontFamily.body, fontSize: 16, lineHeight: 24, color: Palette.inkMuted },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: Palette.ink },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: Palette.line,
    borderRadius: Radius.input,
    backgroundColor: Palette.white,
    fontFamily: FontFamily.body,
    fontSize: 16,
    color: Palette.ink,
  },
  error: { fontFamily: FontFamily.bodyMedium, fontSize: 14, color: Palette.danger },
  submit: { marginTop: 8 },
});
