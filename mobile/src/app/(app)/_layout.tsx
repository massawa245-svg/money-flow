import { Stack } from 'expo-router';

import { Palette } from '@/constants/theme';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Palette.sand } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="send" />
      <Stack.Screen name="funds" />
      <Stack.Screen name="scan" options={{ contentStyle: { backgroundColor: Palette.night } }} />
      <Stack.Screen name="pay/[id]" />
    </Stack>
  );
}
