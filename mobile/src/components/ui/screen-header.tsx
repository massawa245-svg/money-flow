import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { FontFamily, Palette } from '@/constants/theme';

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
};

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Zurück"
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.back}>
        <Icon name="back" size={22} color={Palette.ink} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: FontFamily.display, fontSize: 22, color: Palette.ink },
});
