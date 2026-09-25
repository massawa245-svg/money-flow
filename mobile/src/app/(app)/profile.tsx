import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { api, type KycProfile } from '@/lib/api';
import { useSession } from '@/lib/auth-context';
import {
  authenticateBiometric,
  biometricAvailable,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
} from '@/lib/biometric';
import { takeKycPhoto, uploadKycPhoto, type KycPhoto } from '@/lib/kyc-upload';

type FieldKey = 'firstName' | 'lastName' | 'dateOfBirth' | 'street' | 'postalCode' | 'city' | 'country';
type PhotoKey = 'idFront' | 'idBack' | 'selfie';

const FIELDS: { key: FieldKey; label: string; placeholder?: string; half?: boolean }[] = [
  { key: 'firstName', label: 'Vorname', half: true },
  { key: 'lastName', label: 'Nachname', half: true },
  { key: 'dateOfBirth', label: 'Geburtsdatum', placeholder: 'JJJJ-MM-TT' },
  { key: 'street', label: 'Straße und Hausnummer' },
  { key: 'postalCode', label: 'PLZ', half: true },
  { key: 'city', label: 'Ort', half: true },
  { key: 'country', label: 'Land', placeholder: 'z. B. Äthiopien' },
];

const PHOTOS: { key: PhotoKey; label: string; kind: 'document' | 'selfie' }[] = [
  { key: 'idFront', label: 'Ausweis vorne', kind: 'document' },
  { key: 'idBack', label: 'Ausweis hinten', kind: 'document' },
  { key: 'selfie', label: 'Selfie', kind: 'selfie' },
];

const STATUS: Record<KycProfile['kycStatus'], { icon: IconName; title: string; text: string; bg: string; fg: string }> = {
  NONE: {
    icon: 'shield',
    title: 'Identität bestätigen',
    text: 'Bevor du Geld senden oder bezahlen kannst, prüfen wir deinen Ausweis. Das ist gesetzlich vorgeschrieben.',
    bg: Palette.ochreSoft,
    fg: Palette.ochreInk,
  },
  PENDING: {
    icon: 'clock',
    title: 'Wird geprüft',
    text: 'Wir prüfen deine Angaben. Sobald dein Konto freigeschaltet ist, kannst du alle Funktionen nutzen.',
    bg: Palette.mint,
    fg: Palette.forest,
  },
  APPROVED: {
    icon: 'check',
    title: 'Verifiziert',
    text: 'Dein Konto ist freigeschaltet.',
    bg: Palette.mint,
    fg: Palette.forest,
  },
  REJECTED: {
    icon: 'alert',
    title: 'Prüfung abgelehnt',
    text: 'Bitte korrigiere deine Angaben und reiche sie erneut ein.',
    bg: '#FDE7E4',
    fg: Palette.danger,
  },
};

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const [kyc, setKyc] = useState<KycProfile | null>(null);
  const [form, setForm] = useState<Record<FieldKey, string>>({
    firstName: '', lastName: '', dateOfBirth: '', street: '', postalCode: '', city: '', country: '',
  });
  const [photos, setPhotos] = useState<Partial<Record<PhotoKey, KycPhoto>>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  const load = useCallback(async () => {
    try {
      const { kyc } = await api.getKyc();
      setKyc(kyc);
      setForm((current) => {
        const next = { ...current };
        for (const f of FIELDS) if (kyc[f.key]) next[f.key] = kyc[f.key] as string;
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    biometricAvailable().then(setBioAvailable);
    isBiometricLockEnabled().then(setBioEnabled);
  }, [load]);

  async function toggleBiometric(value: boolean) {
    // Einschalten nur nach erfolgreichem Fingerabdruck, damit niemand fremdes es aktiviert
    if (value && !(await authenticateBiometric('Fingerabdruck bestätigen'))) return;
    await setBiometricLockEnabled(value);
    setBioEnabled(value);
  }

  async function capture(key: PhotoKey, kind: 'document' | 'selfie') {
    setError(null);
    try {
      const photo = await takeKycPhoto(kind);
      if (photo) setPhotos((current) => ({ ...current, [key]: photo }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submit() {
    setError(null);
    if (FIELDS.some((f) => !form[f.key].trim())) return setError('Bitte alle Felder ausfüllen.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth.trim())) return setError('Geburtsdatum bitte als JJJJ-MM-TT, z. B. 1990-05-21.');
    if (PHOTOS.some((p) => !photos[p.key])) return setError('Bitte beide Ausweisseiten und ein Selfie aufnehmen.');
    if (!session) return;

    setSubmitting(true);
    try {
      const userId = session.user.id;
      const [idFrontPath, idBackPath, selfiePath] = await Promise.all(
        PHOTOS.map((p) => uploadKycPhoto(userId, p.key, photos[p.key]!))
      );
      const trimmed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])) as Record<FieldKey, string>;
      const { kyc } = await api.submitKyc({ ...trimmed, idFrontPath, idBackPath, selfiePath });
      setKyc(kyc);
      setPhotos({});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const status = kyc ? STATUS[kyc.kycStatus] : null;
  const canSubmit = kyc?.kycStatus === 'NONE' || kyc?.kycStatus === 'REJECTED';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Profil" />

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Icon name="user" size={28} color={Palette.forest} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {kyc?.firstName ? `${kyc.firstName} ${kyc.lastName ?? ''}` : session?.user.email?.split('@')[0]}
            </Text>
            <Text style={styles.email} numberOfLines={1}>{session?.user.email}</Text>
          </View>
        </View>

        {!kyc ? (
          <ActivityIndicator color={Palette.forest} />
        ) : (
          status && (
            <View style={[styles.statusCard, { backgroundColor: status.bg }]}>
              <Icon name={status.icon} size={24} color={status.fg} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.statusTitle, { color: status.fg }]}>{status.title}</Text>
                <Text style={[styles.statusText, { color: status.fg }]}>
                  {kyc.kycStatus === 'REJECTED' && kyc.kycRejectReason ? kyc.kycRejectReason : status.text}
                </Text>
              </View>
            </View>
          )
        )}

        {canSubmit && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Persönliche Angaben</Text>
            <View style={styles.fields}>
              {FIELDS.map((f) => (
                <View key={f.key} style={[styles.field, f.half && styles.fieldHalf]}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={(text) => setForm((current) => ({ ...current, [f.key]: text }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={Palette.inkFaint}
                    keyboardType={f.key === 'dateOfBirth' || f.key === 'postalCode' ? 'numbers-and-punctuation' : 'default'}
                    autoCapitalize={f.key === 'dateOfBirth' ? 'none' : 'words'}
                    maxLength={100}
                  />
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Ausweis und Selfie</Text>
            <View style={styles.photos}>
              {PHOTOS.map((p) => (
                <Pressable
                  key={p.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.label} aufnehmen`}
                  onPress={() => capture(p.key, p.kind)}
                  style={[styles.photo, photos[p.key] && styles.photoDone]}>
                  {photos[p.key] ? (
                    <Image source={{ uri: photos[p.key]!.uri }} style={styles.photoImage} contentFit="cover" />
                  ) : (
                    <Icon name={p.kind === 'selfie' ? 'user' : 'camera'} size={26} color={Palette.inkMuted} />
                  )}
                  <Text style={styles.photoLabel}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.hintRow}>
              <Icon name="lock" size={16} color={Palette.inkMuted} />
              <Text style={styles.hint}>Deine Fotos werden verschlüsselt gespeichert und nur von unserem Prüfteam angesehen.</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button label="Zur Prüfung einreichen" onPress={submit} loading={submitting} />
          </View>
        )}

        {!canSubmit && error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sicherheit</Text>
          <View style={styles.settingRow}>
            <Icon name="fingerprint" size={24} color={Palette.forest} />
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Mit Fingerabdruck entsperren</Text>
              <Text style={styles.settingText}>
                {bioAvailable ? 'Beim Öffnen der App statt Passwort' : 'Auf diesem Gerät ist kein Fingerabdruck eingerichtet'}
              </Text>
            </View>
            <Switch
              value={bioEnabled}
              onValueChange={toggleBiometric}
              disabled={!bioAvailable}
              trackColor={{ true: Palette.forest, false: Palette.line }}
              thumbColor={Palette.white}
            />
          </View>
        </View>

        <Button label="Abmelden" variant="secondary" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.sand },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Palette.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: FontFamily.display, fontSize: 22, color: Palette.ink },
  email: { fontFamily: FontFamily.body, fontSize: 14, color: Palette.inkMuted },
  statusCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: Radius.card, alignItems: 'flex-start' },
  statusTitle: { fontFamily: FontFamily.bodySemi, fontSize: 16 },
  statusText: { fontFamily: FontFamily.body, fontSize: 14, lineHeight: 20 },
  section: { gap: 12 },
  sectionTitle: { fontFamily: FontFamily.display, fontSize: 18, color: Palette.ink, marginTop: 4 },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { width: '100%', gap: 6 },
  fieldHalf: { width: '47%', flexGrow: 1 },
  label: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: Palette.ink },
  input: {
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Palette.line,
    borderRadius: Radius.input,
    backgroundColor: Palette.white,
    fontFamily: FontFamily.body,
    fontSize: 16,
    color: Palette.ink,
  },
  photos: { flexDirection: 'row', gap: 10 },
  photo: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.line,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  photoDone: { borderStyle: 'solid', borderColor: Palette.forest },
  photoImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  photoLabel: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 12,
    color: Palette.ink,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 6,
    borderRadius: 6,
    position: 'absolute',
    bottom: 8,
  },
  hintRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  hint: { flex: 1, fontFamily: FontFamily.body, fontSize: 13, color: Palette.inkMuted },
  error: { fontFamily: FontFamily.bodyMedium, fontSize: 14, color: Palette.danger },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: Radius.card,
    backgroundColor: Palette.white,
  },
  settingTitle: { fontFamily: FontFamily.bodySemi, fontSize: 15, color: Palette.ink },
  settingText: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.inkMuted },
});
