import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { api, type Overview } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import { KEYS, applyKey } from '@/lib/keypad';

// Ein- und Auszahlen im Testmodus: nur Buchung in der Datenbank, kein echtes Geld
const MODES = {
  deposit: { type: 'DEPOSIT', title: 'Einzahlen', verb: 'einzahlen', done: 'Eingezahlt' },
  withdraw: { type: 'WITHDRAWAL', title: 'Auszahlen', verb: 'auszahlen', done: 'Ausgezahlt' },
} as const;

export default function FundsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = MODES[params.mode === 'withdraw' ? 'withdraw' : 'deposit'];

  const [amountText, setAmountText] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [doneAmount, setDoneAmount] = useState<number | null>(null);

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
      await api.walletAction({ type: mode.type, amount });
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
          <Text style={styles.successMeta}>Testmodus · kein echtes Geld</Text>
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
          label={amount > 0 ? `${formatAmount(amount)} ${currency} ${mode.verb}` : 'Betrag eingeben'}
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
  amountBox: { alignItems: 'center', gap: 6, paddingTop: 24 },
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
