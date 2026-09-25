import * as LocalAuthentication from 'expo-local-authentication';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { api, ApiError, type PaymentDetails } from '@/lib/api';
import { formatAmount } from '@/lib/format';

type ScreenState =
  | { status: 'loading' }
  | { status: 'ready'; payment: PaymentDetails }
  | { status: 'confirming'; payment: PaymentDetails }
  | { status: 'done'; payment: PaymentDetails; success: boolean }
  | { status: 'error'; message: string };

// Biometrie (Fingerabdruck/Face ID, sonst Geräte-PIN) vor jeder Zahlung.
// Geräte ohne eingerichtete Sperre können trotzdem bezahlen.
async function verifyOwner(): Promise<boolean> {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  if (!hasHardware || !enrolled) return true;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Zahlung bestätigen',
    cancelLabel: 'Abbrechen',
  });
  return result.success;
}

function useCountdown(expiresAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return null;
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  return { seconds, label: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` };
}

export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<ScreenState>({ status: 'loading' });

  const payment = 'payment' in state ? state.payment : undefined;
  const countdown = useCountdown(state.status === 'ready' || state.status === 'confirming' ? payment?.expiresAt : undefined);
  const expired = countdown?.seconds === 0 || payment?.status === 'EXPIRED';

  useEffect(() => {
    let cancelled = false;
    api
      .getPayment(id)
      .then(({ payment }) => {
        if (!cancelled) setState({ status: 'ready', payment });
      })
      .catch((error: ApiError) => {
        if (!cancelled) setState({ status: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleConfirm() {
    if (state.status !== 'ready') return;
    const current = state.payment;
    if (!(await verifyOwner())) return;

    setState({ status: 'confirming', payment: current });
    try {
      const { success, payment } = await api.confirmPayment(id);
      setState({ status: 'done', payment, success });
    } catch (error) {
      setState({ status: 'error', message: (error as ApiError).message });
    }
  }

  if (state.status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Palette.forest} />
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <View style={styles.errorBadge}>
            <Icon name="alert" size={32} color={Palette.danger} strokeWidth={2.6} />
          </View>
          <Text style={styles.errorTitle}>Zahlung nicht möglich</Text>
          <Text style={styles.errorText}>{state.message}</Text>
        </View>
        <Button label="Zurück zum Start" variant="secondary" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  if (state.status === 'done') {
    const { payment: done, success } = state;
    return (
      <SafeAreaView style={[styles.resultArea, { backgroundColor: success ? Palette.forest : Palette.ink }]}>
        <StatusBar style="light" />
        <View style={styles.resultBody}>
          <View style={styles.resultBadge}>
            <Icon
              name={success ? 'check' : 'close'}
              size={48}
              color={success ? Palette.forest : Palette.danger}
              strokeWidth={2.4}
            />
          </View>
          <Text style={styles.resultTitle}>{success ? 'Bezahlt' : 'Fehlgeschlagen'}</Text>
          <Text style={styles.resultAmount}>
            {formatAmount(done.amount)} <Text style={styles.resultCurrency}>{done.currency}</Text>
          </Text>
          <Text style={styles.resultMeta}>an {done.merchantName}</Text>

          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <Text style={styles.resultRowLabel}>Zahlungs-ID</Text>
              <Text style={styles.resultRowValue} numberOfLines={1}>
                {done.id}
              </Text>
            </View>
          </View>
        </View>
        <Button label="Fertig" variant="light" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const ready = state.payment;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ScreenHeader title="Zahlung bestätigen" onBack={() => router.replace('/')} />

        <View style={styles.summary}>
          <View style={styles.storeIcon}>
            <Icon name="store" size={30} color={Palette.ink} strokeWidth={1.8} />
          </View>
          <Text style={styles.merchant}>{ready.merchantName}</Text>
          <Text style={styles.amount}>
            {formatAmount(ready.amount)} <Text style={styles.amountCurrency}>{ready.currency}</Text>
          </Text>
          {countdown ? (
            <Text style={[styles.countdown, expired && styles.countdownExpired]}>
              {expired ? 'QR-Code abgelaufen' : `QR gültig noch ${countdown.label}`}
            </Text>
          ) : null}
        </View>

        {ready.reference ? (
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Referenz</Text>
              <Text style={styles.detailValue}>{ready.reference}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button
          label={expired ? 'Neuen QR-Code scannen' : 'Bestätigen und bezahlen'}
          icon={expired ? undefined : <Icon name="faceId" size={22} color={Palette.white} />}
          onPress={expired ? () => router.replace('/scan') : handleConfirm}
          loading={state.status === 'confirming'}
        />
        <Button label="Abbrechen" variant="ghost" onPress={() => router.replace('/')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.sand, paddingHorizontal: 20, paddingBottom: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: Palette.sand },
  content: { flex: 1, paddingTop: 8, gap: 24 },
  summary: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: Radius.card,
    backgroundColor: Palette.white,
    alignItems: 'center',
    gap: 12,
  },
  storeIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Palette.sandDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchant: { fontFamily: FontFamily.bodySemi, fontSize: 16, color: Palette.ink, textAlign: 'center' },
  amount: {
    fontFamily: FontFamily.display,
    fontSize: 48,
    color: Palette.ink,
    letterSpacing: -1.4,
    fontVariant: ['tabular-nums'],
  },
  amountCurrency: { fontSize: 22 },
  countdown: {
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Palette.ochreSoft,
    color: Palette.ochreInk,
    fontFamily: FontFamily.bodySemi,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  countdownExpired: { backgroundColor: '#FDE7E4', color: Palette.danger },
  details: { borderRadius: 20, backgroundColor: Palette.white, paddingHorizontal: 20, paddingVertical: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, gap: 16 },
  detailLabel: { fontFamily: FontFamily.body, fontSize: 15, color: Palette.inkMuted },
  detailValue: { flexShrink: 1, fontFamily: FontFamily.bodySemi, fontSize: 15, color: Palette.ink, textAlign: 'right' },
  footer: { gap: 10 },
  errorBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FDE7E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { fontFamily: FontFamily.display, fontSize: 24, color: Palette.ink },
  errorText: { fontFamily: FontFamily.body, fontSize: 16, color: Palette.inkMuted, textAlign: 'center', maxWidth: 300 },
  resultArea: { flex: 1, paddingHorizontal: 24, paddingBottom: 16 },
  resultBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  resultBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resultTitle: { fontFamily: FontFamily.display, fontSize: 32, color: Palette.white },
  resultAmount: {
    fontFamily: FontFamily.display,
    fontSize: 52,
    color: Palette.white,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  resultCurrency: { fontSize: 22 },
  resultMeta: { fontFamily: FontFamily.body, fontSize: 16, color: Palette.mint },
  resultCard: {
    alignSelf: 'stretch',
    marginTop: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, gap: 16 },
  resultRowLabel: { fontFamily: FontFamily.body, fontSize: 15, color: Palette.mint },
  resultRowValue: { flexShrink: 1, fontFamily: FontFamily.bodySemi, fontSize: 15, color: Palette.white },
});
