import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { FontFamily, Palette, Radius } from '@/constants/theme';
import type { KycStatus } from '@/lib/api';
import { useSession } from '@/lib/auth-context';

type SideMenuProps = {
  open: boolean;
  onClose: () => void;
  name: string;
  email: string;
  kycStatus?: KycStatus;
};

const NAV: { icon: IconName; label: string; href: Href }[] = [
  { icon: 'send', label: 'Geld senden', href: '/send' },
  { icon: 'scan', label: 'QR bezahlen', href: '/scan' },
  { icon: 'plus', label: 'Einzahlen', href: '/funds?mode=deposit' },
  { icon: 'withdraw', label: 'Auszahlen', href: '/funds?mode=withdraw' },
  { icon: 'exchange', label: 'Geld wechseln', href: '/exchange' },
];

const KYC_BADGE: Record<KycStatus, { label: string; bg: string; fg: string }> = {
  NONE: { label: 'Nicht verifiziert', bg: Palette.ochreSoft, fg: Palette.ochreInk },
  PENDING: { label: 'Wird geprüft', bg: Palette.mint, fg: Palette.forest },
  APPROVED: { label: 'Verifiziert', bg: Palette.mint, fg: Palette.forest },
  REJECTED: { label: 'Abgelehnt', bg: '#FDE7E4', fg: Palette.danger },
};

export function SideMenu({ open, onClose, name, email, kycStatus }: SideMenuProps) {
  const router = useRouter();
  const { signOut } = useSession();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width * 0.84, 340);
  const progress = useRef(new Animated.Value(0)).current;
  // Modal bleibt sichtbar, bis die Schließ-Animation fertig ist
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) setVisible(true);
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? 260 : 200,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
  }, [open, progress]);

  function go(href: Href) {
    onClose();
    router.push(href);
  }

  const badge = kycStatus ? KYC_BADGE[kycStatus] : null;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable accessibilityLabel="Menü schließen" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { width: panelWidth, transform: [{ translateX }] }]}>
        <SafeAreaView style={styles.panelInner} edges={['top', 'bottom', 'left']}>
          <View style={styles.top}>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <Icon name="wallet" size={18} color={Palette.white} />
              </View>
              <Text style={styles.brandName}>Africa Wallet</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Menü schließen" onPress={onClose} style={styles.close}>
              <Icon name="close" size={20} color={Palette.ink} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            <Pressable
              accessibilityRole="button"
              onPress={() => go('/profile')}
              style={({ pressed }) => [styles.userCard, pressed && styles.pressed]}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitial}>{name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.userName} numberOfLines={1}>{name}</Text>
                <Text style={styles.userEmail} numberOfLines={1}>{email}</Text>
                {badge ? (
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
                  </View>
                ) : null}
              </View>
              <Icon name="chevron" size={18} color={Palette.mint} />
            </Pressable>

            <View style={styles.group}>
              {NAV.map((item) => (
                <MenuItem key={item.label} icon={item.icon} label={item.label} onPress={() => go(item.href)} />
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.group}>
              <MenuItem icon="user" label="Profil & Verifizierung" onPress={() => go('/profile')} />
              <MenuItem icon="settings" label="Einstellungen" onPress={() => go('/settings')} />
            </View>
          </ScrollView>

          <View style={styles.bottom}>
            <MenuItem
              icon="logout"
              label="Abmelden"
              color={Palette.danger}
              onPress={() => {
                onClose();
                signOut();
              }}
            />
            <Text style={styles.version}>Testmodus · Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  color = Palette.ink,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && { backgroundColor: Palette.sandDeep }]}>
      <View style={styles.itemIcon}>
        <Icon name={icon} size={20} color={color === Palette.ink ? Palette.forest : color} />
      </View>
      <Text style={[styles.itemLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,20,18,0.45)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Palette.sand,
    borderTopRightRadius: Radius.card,
    borderBottomRightRadius: Radius.card,
    overflow: 'hidden',
  },
  panelInner: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Palette.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontFamily: FontFamily.display, fontSize: 18, color: Palette.ink },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 16, gap: 12 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 8,
    padding: 16,
    borderRadius: Radius.card,
    backgroundColor: Palette.forest,
  },
  pressed: { opacity: 0.85 },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Palette.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: { fontFamily: FontFamily.display, fontSize: 20, color: Palette.white },
  userName: { fontFamily: FontFamily.bodySemi, fontSize: 16, color: Palette.white },
  userEmail: { fontFamily: FontFamily.body, fontSize: 13, color: Palette.mint },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 2 },
  badgeText: { fontFamily: FontFamily.bodySemi, fontSize: 11 },
  group: { gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { fontFamily: FontFamily.bodySemi, fontSize: 15 },
  divider: { height: 1, backgroundColor: Palette.sandDeep, marginHorizontal: 12 },
  bottom: { paddingHorizontal: 12, paddingBottom: 12, gap: 8, borderTopWidth: 1, borderTopColor: Palette.sandDeep, paddingTop: 8 },
  version: { fontFamily: FontFamily.body, fontSize: 12, color: Palette.inkFaint, paddingHorizontal: 12 },
});
