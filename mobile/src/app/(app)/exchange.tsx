import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { api, ApiError, type Balance, type FxQuote } from '@/lib/api';
import { formatAmount, formatMoney } from '@/lib/format';
import { KEYS, applyKey } from '@/lib/keypad';

const CURRENCIES = ['EUR', 'USD', 'ETB'] as const;

function formatRate(value: number) {
  return value.toLocaleString('de-DE', { maximumFractionDigits: value < 1 ? 6 : 4 });
}

function CurrencyPicker({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  return (
    <View style={styles.pickerRow} accessibilityLabel={label}>
      {CURRENCIES.map((c) => (
        <Pressable
          key={c}
          accessibilityRole="button"
          accessibilityState={{ selected: value === c }}
          onPress={() => onChange(c)}
          style={[styles.chip, value === c && styles.chipActive]}>
          <Text style={[styles.chipText, value === c && styles.chipTextActive]}>{c}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ExchangeScreen() {
  const router = useRouter();
  const [from, setFrom] = useState('EUR');
  const [to, setTo] = useState('ETB');
  const [amountText, setAmountText] = useState('100');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<FxQuote | null>(null);
  const [quoteVersion, setQuoteVersion] = useState(0);

  const amount = Number((amountText || '0').replace(',', '.'));

  useEffect(() => {
    api.getOverview().then((o) => setBalances(o.balances ?? []), () => {});
  }, []);

  // Kurs neu laden, wenn sich Betrag oder Währungen ändern (kurz verzögert beim Tippen)
  useEffect(() => {
    setQuote(null);
    setError(null);
    if (from === to || !(amount >= 1)) return;
    setLoadingQuote(true);
    const timer = setTimeout(() => {
      api
        .getFxQuote(from, to, amount)
        .then(({ quote }) => setQuote(quote))
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoadingQuote(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [from, to, amount, quoteVersion]);

  function pickFrom(c: string) {
    if (c === to) setTo(from);
    setFrom(c);
  }

  function pickTo(c: string) {
    if (c === from) setFrom(to);
    setTo(c);
  }

  async function handleExchange() {
    if (!quote) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.exchange({ from, to, amount: quote.fromAmount, expectedToAmount: quote.toAmount });
      setBalances(result.balances);
      setDone(quote);
    } catch (e) {
      setError((e as Error).message);
      // Kurs hat sich geändert: neuen Kurs laden, Kunde bestätigt erneut
      if (e instanceof ApiError && e.status === 409) setQuoteVersion((v) => v + 1);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.successArea}>
        <View style={styles.successBody}>
          <View style={styles.successCheck}>
            <Icon name="check" size={48} color={Palette.forest} strokeWidth={2.4} />
          </View>
          <Text style={styles.successTitle}>Gewechselt</Text>
          <Text style={styles.successAmount}>{formatMoney(done.toAmount, done.toCurrency)}</Text>
          <Text style={styles.successMeta}>für {formatMoney(done.fromAmount, done.fromCurrency)} · Testmodus</Text>
        </View>
        <Button label="Fertig" variant="light" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const available = balances.find((b) => b.currency === from)?.amount ?? 0;
  const [whole, fraction] = amountText ? amountText.split(',') : ['0', undefined];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Geld wechseln" />

        <View style={styles.section}>
          <Text style={styles.label}>Von</Text>
          <CurrencyPicker value={from} onChange={pickFrom} label="Ausgangswährung" />
        </View>

        <View style={styles.amountBox} accessible accessibilityLabel={`Betrag ${amountText || '0'} ${from}`}>
          <Text style={styles.amount}>
            {whole || '0'}
            <Text style={styles.amountFraction}>,{(fraction ?? '').padEnd(2, '0')}</Text>
          </Text>
          <Text style={styles.amountMeta}>
            {from} · verfügbar {formatAmount(available)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Nach</Text>
          <CurrencyPicker value={to} onChange={pickTo} label="Zielwährung" />
        </View>

        <View style={styles.quoteCard}>
          <Text style={styles.quoteLabel}>Du erhältst</Text>
          <Text style={styles.quoteAmount}>
            {loadingQuote ? '…' : quote ? formatMoney(quote.toAmount, to) : '–'}
          </Text>
          {quote ? (
            <Text style={styles.quoteMeta}>
              1 {from} = {formatRate(quote.rate)} {to} · Gebühr {formatMoney(quote.fee, from)} (
              {quote.markupPercent.toLocaleString('de-DE')} %)
            </Text>
          ) : null}
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
          label={quote ? `${formatMoney(quote.fromAmount, from)} wechseln` : 'Betrag eingeben'}
          onPress={handleExchange}
          disabled={!quote || loadingQuote}
          loading={submitting}
        />
        <Text style={styles.attribution}>Testmodus – kein echtes Geld · Kurse: Rates By Exchange Rate API</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.sand },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 16 },
  section: { gap: 8 },
  label: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: Palette.ink },
  pickerRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Palette.forest, borderColor: Palette.forest },
  chipText: { fontFamily: FontFamily.bodySemi, fontSize: 15, color: Palette.ink },
  chipTextActive: { color: Palette.white },
  amountBox: { alignItems: 'center', gap: 4 },
  amount: {
    fontFamily: FontFamily.display,
    fontSize: 48,
    color: Palette.ink,
    letterSpacing: -1.4,
    fontVariant: ['tabular-nums'],
  },
  amountFraction: { color: Palette.inkFaint },
  amountMeta: { fontFamily: FontFamily.body, fontSize: 14, color: Palette.inkMuted },
  quoteCard: { padding: 16, borderRadius: Radius.card, backgroundColor: Palette.white, gap: 4 },
  quoteLabel: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.inkMuted },
  quoteAmount: { fontFamily: FontFamily.display, fontSize: 26, color: Palette.forest, fontVariant: ['tabular-nums'] },
  quoteMeta: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.inkMuted },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4, marginTop: 'auto' },
  key: { width: '33.333%', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: FontFamily.bodyMedium, fontSize: 24, color: Palette.ink },
  error: { fontFamily: FontFamily.bodyMedium, fontSize: 14, color: Palette.danger, textAlign: 'center' },
  attribution: { fontFamily: FontFamily.body, fontSize: 11, color: Palette.inkFaint, textAlign: 'center' },
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
    fontSize: 44,
    color: Palette.white,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  successMeta: { fontFamily: FontFamily.body, fontSize: 16, color: Palette.mint },
});
