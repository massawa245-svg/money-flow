import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { api, type DepositMethod, type Overview } from '@/lib/api';
import { useSession } from '@/lib/auth-context';
import { formatAmount } from '@/lib/format';
import { KEYS, applyKey } from '@/lib/keypad';

// Ein- und Auszahlen im Testmodus: nur Buchung in der Datenbank, kein echtes Geld
const MODES = {
  deposit: { type: 'DEPOSIT', title: 'Einzahlen', verb: 'einzahlen', done: 'Eingezahlt' },
  withdraw: { type: 'WITHDRAWAL', title: 'Auszahlen', verb: 'auszahlen', done: 'Ausgezahlt' },
} as const;

// Einzahlungswege (Testmodus: simuliert, es wird keine Kartennummer eingegeben)
const METHODS: { key: DepositMethod; title: string; text: string }[] = [
  { key: 'BANK', title: 'Überweisung', text: 'Per IBAN von deinem Bankkonto' },
  { key: 'VISA', title: 'Visa', text: 'Testkarte •••• 4242' },
  { key: 'MASTERCARD', title: 'Mastercard', text: 'Testkarte •••• 4444' },
];

function MethodLogo({ method }: { method: DepositMethod }) {
  if (method === 'VISA') return <Text style={styles.visa}>VISA</Text>;
  if (method === 'MASTERCARD') {
    return (
      <View style={styles.mcLogo}>
        <View style={[styles.mcCircle, { backgroundColor: '#EB001B' }]} />
        <View style={[styles.mcCircle, { backgroundColor: '#F79E1B', marginLeft: -8, opacity: 0.9 }]} />
      </View>
    );
  }
  return <Icon name="bank" size={22} color={Palette.forest} />;
}

export default function FundsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { session } = useSession();
  const mode = MODES[params.mode === 'withdraw' ? 'withdraw' : 'deposit'];

  const [amountText, setAmountText] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [doneAmount, setDoneAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<DepositMethod>('BANK');
  const isDeposit = mode.type === 'DEPOSIT';
  const methodInfo = METHODS.find((m) => m.key === method)!;

  useEffect(() => {
    api.getOverview().then(setOverview, () => {});
  }, []);

  const amount = Number((amountText || '0').replace(',', '.'));
  const currency = overview?.currency ?? '';
  const [whole, fraction] = amountText ? amountText.split(',') : ['0', undefined];
  const canSubmit = amount > 0 && !submitting;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await api.walletAction({ type: mode.type, amount, ...(isDeposit ? { method } : {}) });
      setDoneAmount(amount);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (doneAmount !== null) {
    return (
      <SafeAreaView style={styles.successArea}>
        <View style={styles.successBody}>
          <View style={styles.successCheck}>
            <Icon name="check" size={48} color={Palette.forest} strokeWidth={2.4} />
          </View>
          <Text style={styles.successTitle}>{mode.done}</Text>
          <Text style={styles.successAmount}>
            {formatAmount(doneAmount)} <Text style={styles.successCurrency}>{currency}</Text>
          </Text>
          <Text style={styles.successMeta}>
            {isDeposit ? `per ${methodInfo.title} · ` : ''}Testmodus · kein echtes Geld
          </Text>
        </View>
        <Button label="Fertig" variant="light" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={mode.title} />

        <View style={styles.notice}>
          <Icon name="alert" size={18} color={Palette.ink} />
          <Text style={styles.noticeText}>Testmodus: Es wird nur der Kontostand geändert, kein echtes Geld bewegt.</Text>
        </View>

        {isDeposit ? (
          <View style={styles.methods}>
            {METHODS.map((m) => {
              const selected = m.key === method;
              return (
                <Pressable
                  key={m.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setMethod(m.key)}
                  style={[styles.method, selected && styles.methodActive]}>
                  <View style={styles.methodLogo}>
                    <MethodLogo method={m.key} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.methodTitle}>{m.title}</Text>
                    <Text style={styles.methodText}>{m.text}</Text>
                  </View>
                  <View style={[styles.radio, selected && styles.radioActive]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {isDeposit && method === 'BANK' ? (
          <View style={styles.ibanCard}>
            <Text style={styles.ibanLabel}>Überweise auf dein Wallet-Konto</Text>
            {overview?.depositIban ? (
              <Text style={styles.iban} selectable>
                {overview.depositIban.replace(/(.{4})/g, '$1 ').trim()}
              </Text>
            ) : (
              <Text style={styles.ibanMissing}>Noch keine IBAN – eröffne dein Konto im Web unter „Bank“.</Text>
            )}
            <Text style={styles.ibanLabel}>
              Verwendungszweck: <Text style={styles.ibanRef}>AW-{session?.user.id.slice(0, 8).toUpperCase()}</Text>
            </Text>
          </View>
        ) : null}

        <View style={styles.amountBox} accessible accessibilityLabel={`Betrag ${amountText || '0'} ${currency}`}>
          <Text style={styles.amount}>
            {whole || '0'}
            <Text style={styles.amountFraction}>,{(fraction ?? '').padEnd(2, '0')}</Text>
          </Text>
          <Text style={styles.amountMeta}>
            {currency}
            {overview ? ` · Guthaben ${formatAmount(overview.balance)}` : ''}
          </Text>
        </View>

        <View style={styles.keypad}>
          {KEYS.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? 'Löschen' : key}
              onPress={() => setAmountText((current) => applyKey(current, key))}
              style={({ pressed }) => [styles.key, pressed && { backgroundColor: Palette.sandDeep }]}>
              {key === 'del' ? (
                <Icon name="back" size={24} color={Palette.ink} />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={
            amount > 0
              ? isDeposit
                ? method === 'BANK'
                  ? `Testüberweisung über ${formatAmount(amount)} ${currency}`
                  : `${formatAmount(amount)} ${currency} per ${methodInfo.title}`
                : `${formatAmount(amount)} ${currency} ${mode.verb}`
              : 'Betrag eingeben'
          }
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.sand },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 20 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: Radius.input,
    backgroundColor: Palette.sandDeep,
  },
  noticeText: { flex: 1, fontFamily: FontFamily.body, fontSize: 13, color: Palette.ink },
  methods: { gap: 8 },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.white,
  },
  methodActive: { borderColor: Palette.forest, backgroundColor: '#F1F7F3' },
  methodLogo: {
    width: 48,
    height: 32,
    borderRadius: 8,
    backgroundColor: Palette.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: { fontFamily: FontFamily.bodySemi, fontSize: 15, color: Palette.ink },
  methodText: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.inkMuted },
  visa: { fontFamily: FontFamily.display, fontSize: 15, fontStyle: 'italic', color: '#1A1F71', letterSpacing: 0.5 },
  mcLogo: { flexDirection: 'row' },
  mcCircle: { width: 18, height: 18, borderRadius: 9 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: Palette.forest },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.forest },
  ibanCard: { padding: 16, borderRadius: Radius.card, backgroundColor: Palette.white, gap: 6 },
  ibanLabel: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.inkMuted },
  iban: { fontFamily: FontFamily.bodySemi, fontSize: 17, color: Palette.ink, letterSpacing: 0.5 },
  ibanRef: { fontFamily: FontFamily.bodySemi, color: Palette.ink },
  ibanMissing: { fontFamily: FontFamily.bodyMedium, fontSize: 14, color: Palette.ochreInk },
  amountBox: { alignItems: 'center', gap: 6, paddingTop: 8 },
  amount: {
    fontFamily: FontFamily.display,
    fontSize: 56,
    color: Palette.ink,
    letterSpacing: -1.6,
    fontVariant: ['tabular-nums'],
  },
  amountFraction: { color: Palette.inkFaint },
  amountMeta: { fontFamily: FontFamily.body, fontSize: 14, color: Palette.inkMuted },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, marginTop: 'auto' },
  key: { width: '33.333%', height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: FontFamily.bodyMedium, fontSize: 24, color: Palette.ink },
  error: { fontFamily: FontFamily.bodyMedium, fontSize: 14, color: Palette.danger, textAlign: 'center' },
  successArea: { flex: 1, backgroundColor: Palette.forest, paddingHorizontal: 24, paddingBottom: 24 },
  successBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  successCheck: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { fontFamily: FontFamily.display, fontSize: 32, color: Palette.white },
  successAmount: {
    fontFamily: FontFamily.display,
    fontSize: 52,
    color: Palette.white,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  successCurrency: { fontSize: 22 },
  successMeta: { fontFamily: FontFamily.body, fontSize: 16, color: Palette.mint },
});
