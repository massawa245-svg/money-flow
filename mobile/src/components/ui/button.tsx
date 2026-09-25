import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { FontFamily, Palette, Radius } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'light' | 'ghost';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const variants: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: Palette.forest, fg: Palette.white },
  secondary: { bg: Palette.white, fg: Palette.ink, border: Palette.line },
  light: { bg: Palette.sand, fg: Palette.ink },
  ghost: { bg: 'transparent', fg: Palette.forest },
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, icon, style }: ButtonProps) {
  const v = variants[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'ghost' && styles.ghost,
        { backgroundColor: v.bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        v.border ? { borderWidth: 1.5, borderColor: v.border } : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: v.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: Radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  ghost: { height: 48 },
  label: { fontFamily: FontFamily.bodySemi, fontSize: 17 },
});
