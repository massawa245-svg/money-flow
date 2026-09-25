import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LockScreen } from '@/components/lock-screen';
import { Palette } from '@/constants/theme';
import { SessionProvider, useSession } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: Palette.sand, primary: Palette.forest, text: Palette.ink },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  return (
    <ThemeProvider value={navigationTheme}>
      <SessionProvider>
        <StatusBar style="dark" />
        <RootNavigator ready={fontsLoaded || !!fontError} />
      </SessionProvider>
    </ThemeProvider>
  );
}

function RootNavigator({ ready }: { ready: boolean }) {
  const { session, isLoading, locked } = useSession();
  const showApp = ready && !isLoading;

  useEffect(() => {
    if (showApp) SplashScreen.hideAsync();
  }, [showApp]);

  // Splash bleibt sichtbar, bis Fonts und Session geladen sind
  if (!showApp) return null;

  // Eingeloggt, aber per Biometrie gesperrt: nichts von der App zeigen
  if (session && locked) return <LockScreen />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Palette.sand } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
