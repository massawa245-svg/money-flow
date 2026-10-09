import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { CURRENCIES, currencyInfo } from '@/lib/currencies';

type CurrencySelectProps = {
  value: string;
  onChange: (code: string) => void;
  label: string;
  // "country": Land als Haupttext (Geld senden), sonst Währung (Geld wechseln)
  variant?: 'currency' | 'country';
};

// Knopf mit Flagge + Code; öffnet eine durchsuchbare Liste aller Währungen
export function CurrencySelect({ value, onChange, label, variant = 'currency' }: CurrencySelectProps) {
  const byCountry = variant === 'country';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const info = currencyInfo(value);

  const q = query.trim().toLowerCase();
  const items = q
    ? CURRENCIES.filter((c) => `${c.code} ${c.name} ${c.country}`.toLowerCase().includes(q))
    : CURRENCIES;

  function close() {
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${info?.name ?? value}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
        <Text style={styles.flag}>{info?.flag ?? '🏳️'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.code} numberOfLines={1}>{byCountry ? info?.country ?? value : value}</Text>
          <Text style={styles.name} numberOfLines={1}>{byCountry ? `${info?.name ?? ''} · ${value}` : info?.name ?? ''}</Text>
        </View>
        <View style={styles.chevron}>
          <Icon name="chevron" size={16} color={Palette.inkMuted} />
        </View>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close} statusBarTranslucent>
        <Pressable accessibilityLabel="Schließen" style={styles.backdrop} onPress={close} />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Schließen" onPress={close} style={styles.close}>
              <Icon name="close" size={18} color={Palette.ink} />
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Land oder Währung suchen"
            placeholderTextColor={Palette.inkFaint}
            style={styles.search}
            autoCorrect={false}
          />
          <FlatList
            data={items}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            renderItem={({ item }) => {
              const selected = item.code === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onChange(item.code);
                    close();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    selected && { backgroundColor: Palette.mint },
                    pressed && { backgroundColor: Palette.sandDeep },
                  ]}>
                  <Text style={styles.rowFlag}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowName}>{byCountry ? item.country : item.name}</Text>
                    <Text style={styles.rowCountry}>{byCountry ? item.name : item.country}</Text>
                  </View>
                  <Text style={styles.rowCode}>{item.code}</Text>
                  {selected ? <Icon name="check" size={18} color={Palette.forest} /> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>Nichts gefunden.</Text>}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.input,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.white,
  },
  flag: { fontSize: 28 },
  code: { fontFamily: FontFamily.bodySemi, fontSize: 16, color: Palette.ink },
  name: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.inkMuted },
  chevron: { transform: [{ rotate: '90deg' }] },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,18,0.45)' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: Palette.sand,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingHorizontal: 16,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Palette.line, marginTop: 10 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  sheetTitle: { fontFamily: FontFamily.display, fontSize: 20, color: Palette.ink },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: Radius.input,
    backgroundColor: Palette.white,
    fontFamily: FontFamily.body,
    fontSize: 15,
    color: Palette.ink,
    marginBottom: 8,
  },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 14 },
  rowFlag: { fontSize: 28 },
  rowName: { fontFamily: FontFamily.bodySemi, fontSize: 15, color: Palette.ink },
  rowCountry: { fontFamily: FontFamily.body, fontSize: 12, color: Palette.inkMuted },
  rowCode: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: Palette.inkMuted },
  empty: { fontFamily: FontFamily.body, fontSize: 14, color: Palette.inkMuted, textAlign: 'center', padding: 24 },
});
