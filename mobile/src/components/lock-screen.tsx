import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { FontFamily, Palette } from '@/constants/theme';
import { useSession } from '@/lib/auth-context';
import { authenticateBiometric } from '@/lib/biometric';

// Wird statt der App gezeigt, solange sie per Biometrie gesperrt ist
export function LockScreen() {
  const { session, unlock, signOut } = useSession();
  const [failed, setFailed] = useState(false);

  async function tryUnlock() {
    setFailed(false);
    if (await authenticateBiometric('Africa Wallet entsperren')) unlock();
    else setFailed(true);
  }

  // Beim Öffnen sofort nach dem Fingerabdruck fragen
  useEffect(() => {
    tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.body}>
        <View style={styles.logo}>
          <Icon name="lock" size={32} color={Palette.sand} />
        </View>
        <Text style={styles.title}>Africa Wallet ist gesperrt</Text>
        <Text style={styles.lead}>{session?.user.email}</Text>
        {failed ? <Text style={styles.error}>Nicht erkannt. Bitte erneut versuchen.</Text> : null}
      </View>
      <View style={styles.actions}>
        <Button
          label="Mit Fingerabdruck entsperren"
          icon={<Icon name="fingerprint" size={22} color={Palette.white} />}
          onPress={tryUnlock}
        />
        <Button label="Mit Passwort anmelden" variant="ghost" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.sand, paddingHorizontal: 24, paddingBottom: 24 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Palette.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: FontFamily.display, fontSize: 26, color: Palette.ink, textAlign: 'center' },
  lead: { fontFamily: FontFamily.body, fontSize: 15, color: Palette.inkMuted },
  error: { fontFamily: FontFamily.bodyMedium, fontSize: 14, color: Palette.danger },
  actions: { gap: 8 },
});
