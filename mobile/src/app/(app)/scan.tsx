import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { FontFamily, Palette } from '@/constants/theme';

const FRAME = 272;

type ScanTarget =
  | { kind: 'pay'; paymentId: string }
  | { kind: 'send'; to: string; amount?: string };

// QR kodiert entweder die nackte payment_id, einen Kassen-Link (.../pay/<id>)
// oder einen "Geld empfangen"-Link (.../transfer?to=<email>&amount=<betrag>)
function parseScan(data: string): ScanTarget {
  try {
    const url = new URL(data);
    const parts = url.pathname.split('/').filter(Boolean);
    const to = url.searchParams.get('to');
    if (parts[parts.length - 1] === 'transfer' && to) {
      return { kind: 'send', to, amount: url.searchParams.get('amount') ?? undefined };
    }
    return { kind: 'pay', paymentId: parts[parts.length - 1] || data };
  } catch {
    return { kind: 'pay', paymentId: data };
  }
}

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  function handleScan(data: string) {
    if (scanned) return;
    setScanned(true);
    const target = parseScan(data);
    if (target.kind === 'send') {
      router.replace({ pathname: '/send', params: { to: target.to, amount: target.amount ?? '' } });
    } else {
      router.replace(`/pay/${target.paymentId}`);
    }
  }

  const granted = permission?.granted;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : (result) => handleScan(result.data)}
        />
      ) : null}

      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            onPress={() => router.back()}
            style={styles.roundButton}>
            <Icon name="close" size={22} color={Palette.white} />
          </Pressable>
          <Text style={styles.title}>An der Kasse bezahlen</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Taschenlampe aus' : 'Taschenlampe an'}
            accessibilityState={{ selected: torch }}
            disabled={!granted}
            onPress={() => setTorch((t) => !t)}
            style={[styles.roundButton, torch && { backgroundColor: Palette.ochre }]}>
            <Icon name="flash" size={20} color={torch ? Palette.night : Palette.white} />
          </Pressable>
        </View>

        <View style={styles.center}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>

          {permission && !granted ? (
            <View style={styles.permission}>
              <Text style={styles.hint}>Für den QR-Scan wird Kamerazugriff benötigt.</Text>
              <Button label="Kamera erlauben" variant="light" onPress={requestPermission} />
            </View>
          ) : (
            <Text style={styles.hint}>
              Halte den QR-Code der Kasse in den Rahmen. Der Betrag wird automatisch erkannt.
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const cornerSize = 56;
const cornerWidth = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.night },
  overlay: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  title: { fontFamily: FontFamily.display, fontSize: 20, color: Palette.white },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.nightButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  frame: { width: FRAME, height: FRAME },
  corner: { position: 'absolute', width: cornerSize, height: cornerSize, borderColor: Palette.ochre },
  tl: { left: 0, top: 0, borderLeftWidth: cornerWidth, borderTopWidth: cornerWidth, borderTopLeftRadius: 28 },
  tr: { right: 0, top: 0, borderRightWidth: cornerWidth, borderTopWidth: cornerWidth, borderTopRightRadius: 28 },
  bl: { left: 0, bottom: 0, borderLeftWidth: cornerWidth, borderBottomWidth: cornerWidth, borderBottomLeftRadius: 28 },
  br: {
    right: 0,
    bottom: 0,
    borderRightWidth: cornerWidth,
    borderBottomWidth: cornerWidth,
    borderBottomRightRadius: 28,
  },
  hint: {
    maxWidth: 290,
    textAlign: 'center',
    fontFamily: FontFamily.body,
    fontSize: 16,
    lineHeight: 24,
    color: Palette.line,
  },
  permission: { gap: 16, alignItems: 'stretch' },
});
