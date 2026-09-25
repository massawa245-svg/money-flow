import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import { api, type Overview, type Transfer } from '@/lib/api';
import { useSession } from '@/lib/auth-context';
import { formatAmount, formatDate } from '@/lib/format';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const email = session?.user.email ?? '';
  const name = (session?.user.user_metadata?.full_name as string | undefined) || email.split('@')[0];

  const load = useCallback(async () => {
    try {
      setOverview(await api.getOverview());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Nach Senden/Bezahlen zurück auf Start → Guthaben neu laden
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const currency = overview?.currency ?? '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.forest} />}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Profil" onPress={() => router.push('/profile')} style={styles.avatar}>
            <Icon name="user" size={22} color={Palette.ink} />
          </Pressable>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceText}>
            <Text style={styles.balanceLabel}>Verfügbares Guthaben</Text>
            {overview ? (
              <Text style={styles.balance}>
                {formatAmount(overview.balance)} <Text style={styles.balanceCurrency}>{currency}</Text>
              </Text>
            ) : error ? (
              <Text style={styles.balanceError}>{error}</Text>
            ) : (
              <ActivityIndicator color={Palette.white} style={styles.balanceLoading} />
            )}
          </View>
        </View>

        {overview && overview.kycStatus !== 'APPROVED' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile')}
            style={[styles.kycBanner, overview.kycStatus === 'PENDING' && { backgroundColor: Palette.mint }]}>
            <Icon
              name={overview.kycStatus === 'PENDING' ? 'clock' : 'shield'}
              size={24}
              color={overview.kycStatus === 'PENDING' ? Palette.forest : Palette.ochreInk}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kycTitle, overview.kycStatus === 'PENDING' && { color: Palette.forest }]}>
                {overview.kycStatus === 'PENDING'
                  ? 'Dein Ausweis wird geprüft'
                  : overview.kycStatus === 'REJECTED'
                    ? 'Prüfung abgelehnt'
                    : 'Konto noch nicht freigeschaltet'}
              </Text>
              <Text style={[styles.kycText, overview.kycStatus === 'PENDING' && { color: Palette.forest }]}>
                {overview.kycStatus === 'PENDING'
                  ? 'Danach kannst du Geld senden und bezahlen.'
                  : 'Tippe hier, um deinen Ausweis hochzuladen.'}
              </Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <ActionTile icon="send" label="Senden" onPress={() => router.push('/send')} />
          <ActionTile icon="scan" label="Bezahlen" onPress={() => router.push('/scan')} />
          <ActionTile icon="plus" label="Einzahlen" onPress={() => router.push('/funds?mode=deposit')} />
          <ActionTile icon="withdraw" label="Auszahlen" onPress={() => router.push('/funds?mode=withdraw')} />
        </View>

        <View style={styles.activity}>
          <Text style={styles.sectionTitle}>Letzte Aktivität</Text>
          {overview && overview.transfers.length === 0 ? (
            <Text style={styles.empty}>Noch keine Transaktionen.</Text>
          ) : null}
          {overview?.transfers.slice(0, 20).map((t) => (
            <TransferRow key={t.id} transfer={t} myEmail={email} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.tabBar}>
        <View style={styles.tab}>
          <Icon name="home" color={Palette.forest} />
          <Text style={[styles.tabLabel, { color: Palette.forest }]}>Start</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="QR scannen"
          onPress={() => router.push('/scan')}
          style={styles.scanFab}>
          <Icon name="scan" size={26} color={Palette.white} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/send')} style={styles.tab}>
          <Icon name="send" color={Palette.inkMuted} />
          <Text style={styles.tabLabel}>Senden</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ActionTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}>
      <Icon name={icon} color={Palette.forest} />
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

function TransferRow({ transfer, myEmail }: { transfer: Transfer; myEmail: string }) {
  // Ein-/Auszahlungen (Testmodus) sind Transfers an sich selbst; der Status unterscheidet sie
  const walletAction = transfer.status === 'DEPOSIT' || transfer.status === 'WITHDRAWAL';
  const outgoing = walletAction ? transfer.status === 'WITHDRAWAL' : transfer.sender.email === myEmail;
  const other = outgoing ? transfer.recipient : transfer.sender;
  const otherName = walletAction
    ? transfer.status === 'DEPOSIT'
      ? 'Einzahlung'
      : 'Auszahlung'
    : other.name || other.email;
  const label = walletAction ? 'Testmodus' : outgoing ? 'Gesendet' : 'Erhalten';

  return (
    <View style={styles.row}>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowInitial}>{otherName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {otherName}
        </Text>
        <Text style={styles.rowMeta}>
          {label} · {formatDate(transfer.createdAt)}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color: outgoing ? Palette.ink : Palette.positive }]}>
        {outgoing ? '− ' : '+ '}
        {formatAmount(transfer.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.sand },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, gap: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { flex: 1, gap: 2 },
  greeting: { fontFamily: FontFamily.body, fontSize: 14, color: Palette.inkMuted },
  name: { fontFamily: FontFamily.display, fontSize: 22, color: Palette.ink },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.sandDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: { padding: 24, borderRadius: Radius.card, backgroundColor: Palette.forest },
  balanceText: { gap: 6 },
  balanceLabel: { fontFamily: FontFamily.body, fontSize: 14, color: Palette.mint },
  balance: {
    fontFamily: FontFamily.display,
    fontSize: 40,
    color: Palette.white,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  balanceCurrency: { fontFamily: FontFamily.displaySemi, fontSize: 20 },
  balanceError: { fontFamily: FontFamily.bodyMedium, fontSize: 15, color: Palette.white },
  balanceLoading: { alignSelf: 'flex-start', marginVertical: 12 },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: Radius.card,
    backgroundColor: Palette.ochreSoft,
  },
  kycTitle: { fontFamily: FontFamily.bodySemi, fontSize: 15, color: Palette.ochreInk },
  kycText: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.ochreInk },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: '40%',
    paddingVertical: 16,
    borderRadius: Radius.tile,
    backgroundColor: Palette.white,
    alignItems: 'center',
    gap: 8,
  },
  tileLabel: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: Palette.ink },
  activity: { gap: 4 },
  sectionTitle: { fontFamily: FontFamily.display, fontSize: 20, color: Palette.ink, paddingBottom: 8 },
  empty: { fontFamily: FontFamily.body, fontSize: 15, color: Palette.inkMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Palette.sandDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInitial: { fontFamily: FontFamily.bodySemi, fontSize: 15, color: Palette.ink },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontFamily: FontFamily.bodySemi, fontSize: 15, color: Palette.ink },
  rowMeta: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.inkMuted },
  rowAmount: { fontFamily: FontFamily.bodySemi, fontSize: 15, fontVariant: ['tabular-nums'] },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: Palette.white,
    borderTopWidth: 1,
    borderTopColor: Palette.sandDeep,
  },
  tab: { minWidth: 64, alignItems: 'center', gap: 2 },
  tabLabel: { fontFamily: FontFamily.bodyMedium, fontSize: 12, color: Palette.inkMuted },
  scanFab: {
    width: 60,
    height: 60,
    marginTop: -28,
    borderRadius: 30,
    backgroundColor: Palette.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
