import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrencySelect } from '@/components/currency-select';
import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { api, ApiError, type FxQuote, type Overview } from '@/lib/api';
import { currencyInfo } from '@/lib/currencies';
import { formatAmount, formatMoney } from '@/lib/format';
import { KEYS, applyKey } from '@/lib/keypad';

// "12.5" aus dem Link → "12,5" für die Tastatur-Eingabe
function toAmountText(value: string | undefined): string {
  const amount = Number(value);
  if (!value || !Number.isFinite(amount) || amount <= 0) return '';
  return String(Math.round(amount * 100) / 100).replace('.', ',');
}

export default function SendScreen() {
  const router = useRouter();
  // Vorausgefüllt, wenn ein "Geld empfangen"-QR-Code gescannt wurde
  const params = useLocalSearchParams<{ to?: string; amount?: string }>();
  const [recipient, setRecipient] = useState(params.to ?? '');
  const [reference, setReference] = useState('');
  const [amountText, setAmountText] = useState(() => toAmountText(params.amount));
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ amount: number; to: string; received?: FxQuote } | null>(null);
  // Zielland über seine Währung; ohne Auswahl = eigene Währung (Inland)
  const [chosenCurrency, setChosenCurrency] = useState<string | null>(null);
  const [quote, setQuote] = useState<FxQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteVersion, setQuoteVersion] = useState(0);

  useEffect(() => {
    api.getOverview().then(setOverview, () => {});
  }, []);

  const amount = Number((amountText || '0').replace(',', '.'));
  const currency = overview?.currency ?? '';
  const [whole, fraction] = amountText ? amountText.split(',') : ['0', undefined];
  const toCurrency = chosenCurrency ?? currency;
  const crossBorder = !!currency && toCurrency !== currency;
  const canSend = recipient.includes('@') && amount > 0 && !sending && (!crossBorder || (!!quote && !loadingQuote));

  // Auslandsüberweisung: live anzeigen, was beim Empfänger ankommt (kurz verzögert beim Tippen)
  useEffect(() => {
    setQuote(null);
    if (!crossBorder || !(amount >= 1)) return;
    setLoadingQuote(true);
    const timer = setTimeout(() => {
      api
        .getFxQuote(currency, toCurrency, amount)
        .then(({ quote }) => setQuote(quote))
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoadingQuote(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [crossBorder, currency, toCurrency, amount, quoteVersion]);

  async function handleSend() {
    setError(null);
    setSending(true);
    try {
      await api.sendTransfer({
        recipientEmail: recipient.trim(),
        amount,
        reference: reference.trim(),
        ...(crossBorder && quote ? { toCurrency, expectedToAmount: quote.toAmount } : {}),
      });
      setSent({ amount, to: recipient.trim(), received: crossBorder ? quote ?? undefined : undefined });
    } catch (e) {
      setError((e as Error).message);
      // Kurs hat sich geändert: neuen Kurs laden, Kunde bestätigt erneut
      if (e instanceof ApiError && e.status === 409) setQuoteVersion((v) => v + 1);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.successArea}>
        <View style={styles.successBody}>
          <View style={styles.successCheck}>
            <Icon name="check" size={48} color={Palette.forest} strokeWidth={2.4} />
          </View>
          <Text style={styles.successTitle}>Gesendet</Text>
          <Text style={styles.successAmount}>
            {formatAmount(sent.amount)} <Text style={styles.successCurrency}>{currency}</Text>
          </Text>
          <Text style={styles.successMeta}>an {sent.to}</Text>
          {sent.received ? (
            <Text style={styles.successMeta}>
              {currencyInfo(sent.received.toCurrency)?.flag} erhält {formatMoney(sent.received.toAmount, sent.received.toCurrency)}
            </Text>
          ) : null}
        </View>
        <Button label="Fertig" variant="light" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Geld senden" />

        <View style={styles.field}>
          <Text style={styles.label}>Empfängerland</Text>
          <CurrencySelect
            value={toCurrency || 'EUR'}
            onChange={(c) => {
              setError(null);
              setChosenCurrency(c);
            }}
            label="Empfängerland"
            variant="country"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="to-label">
            An
          </Text>
          <TextInput
            accessibilityLabelledBy="to-label"
            style={styles.input}
            placeholder="E-Mail des Empfängers"
            placeholderTextColor={Palette.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={recipient}
            onChangeText={setRecipient}
          />
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

        {crossBorder ? (
          <View style={styles.quoteCard}>
            <Text style={styles.quoteFlag}>{currencyInfo(toCurrency)?.flag}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.quoteLabel}>Empfänger erhält</Text>
              <Text style={styles.quoteAmount}>
                {loadingQuote ? '…' : quote ? formatMoney(quote.toAmount, toCurrency) : `– ${toCurrency}`}
              </Text>
              {quote ? (
                <Text style={styles.quoteMeta}>
                  1 {currency} = {quote.rate.toLocaleString('de-DE', { maximumFractionDigits: quote.rate < 1 ? 6 : 4 })} {toCurrency} · Gebühr{' '}
                  {formatMoney(quote.fee, currency)}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label} nativeID="ref-label">
            Verwendungszweck <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            accessibilityLabelledBy="ref-label"
            style={styles.input}
            placeholder="z. B. Miete September"
            placeholderTextColor={Palette.inkFaint}
            value={reference}
            onChangeText={setReference}
            maxLength={140}
          />
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
          label={amount > 0 ? `${formatAmount(amount)} ${currency} senden` : 'Betrag eingeben'}
          onPress={handleSend}
          disabled={!canSend}
          loading={sending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.sand },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 20 },
  field: { gap: 6 },
  label: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: Palette.ink },
  optional: { fontFamily: FontFamily.body, color: Palette.inkMuted },
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
  quoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: Radius.card,
    backgroundColor: Palette.white,
  },
  quoteFlag: { fontSize: 32 },
  quoteLabel: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.inkMuted },
  quoteAmount: { fontFamily: FontFamily.display, fontSize: 24, color: Palette.forest, fontVariant: ['tabular-nums'] },
  quoteMeta: { fontFamily: FontFamily.body, fontSize: 12, color: Palette.inkMuted },
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
