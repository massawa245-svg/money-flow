import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { useSession } from '@/lib/auth-context';
import {
  authenticateBiometric,
  biometricAvailable,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
} from '@/lib/biometric';
import { isBalanceHidden, setBalanceHidden } from '@/lib/preferences';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    biometricAvailable().then(setBioAvailable);
    isBiometricLockEnabled().then(setBioEnabled);
    isBalanceHidden().then(setHideBalance);
  }, []);

  async function toggleBiometric(value: boolean) {
    // Einschalten nur nach erfolgreichem Fingerabdruck, damit niemand fremdes es aktiviert
    if (value && !(await authenticateBiometric('Fingerabdruck bestätigen'))) return;
    await setBiometricLockEnabled(value);
    setBioEnabled(value);
  }

  async function toggleHideBalance(value: boolean) {
    await setBalanceHidden(value);
    setHideBalance(value);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Einstellungen" />

        <Section title="Konto">
          <Row
            icon="user"
            title="Profil & Verifizierung"
            text={session?.user.email ?? ''}
            onPress={() => router.push('/profile')}
          />
        </Section>

        <Section title="Sicherheit">
          <Row
            icon="fingerprint"
            title="Mit Fingerabdruck entsperren"
            text={bioAvailable ? 'Beim Öffnen der App statt Passwort' : 'Auf diesem Gerät ist kein Fingerabdruck eingerichtet'}
            right={
              <Switch
                value={bioEnabled}
                onValueChange={toggleBiometric}
                disabled={!bioAvailable}
                trackColor={{ true: Palette.forest, false: Palette.line }}
                thumbColor={Palette.white}
              />
            }
          />
        </Section>

        <Section title="Privatsphäre">
          <Row
            icon="eyeOff"
            title="Guthaben verbergen"
            text="Betrag auf der Startseite ausblenden"
            right={
              <Switch
                value={hideBalance}
                onValueChange={toggleHideBalance}
                trackColor={{ true: Palette.forest, false: Palette.line }}
                thumbColor={Palette.white}
              />
            }
          />
        </Section>

        <Section title="Über die App">
          <Row icon="info" title="Version" text={`Africa Wallet ${Constants.expoConfig?.version ?? '1.0.0'}`} />
          <Row icon="shield" title="Testmodus" text="Alle Beträge sind Testgeld. Es wird kein echtes Geld bewegt." />
        </Section>

        <Pressable
          accessibilityRole="button"
          onPress={signOut}
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.85 }]}>
          <Icon name="logout" size={20} color={Palette.danger} />
          <Text style={styles.logoutText}>Abmelden</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  title,
  text,
  right,
  onPress,
}: {
  icon: IconName;
  title: string;
  text?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const body = (
    <>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={20} color={Palette.forest} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {text ? <Text style={styles.rowText}>{text}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron" size={18} color={Palette.inkFaint} /> : null)}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: Palette.divider }]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.sand },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 20 },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: FontFamily.bodySemi,
    fontSize: 13,
    color: Palette.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  card: { borderRadius: Radius.card, backgroundColor: Palette.white, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Palette.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontFamily: FontFamily.bodySemi, fontSize: 15, color: Palette.ink },
  rowText: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.inkMuted },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: Radius.button,
    backgroundColor: Palette.white,
    borderWidth: 1.5,
    borderColor: '#F3C9C4',
  },
  logoutText: { fontFamily: FontFamily.bodySemi, fontSize: 16, color: Palette.danger },
});
