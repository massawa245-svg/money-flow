import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

// App-Sperre per Fingerabdruck/Gesicht. Die Supabase-Session bleibt gespeichert;
// die Biometrie entscheidet nur, ob die App nach dem Öffnen entsperrt wird.
const ENABLED_KEY = 'biometric-lock-enabled';
const ASKED_KEY = 'biometric-lock-asked';

export async function biometricAvailable() {
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && enrolled;
}

export async function isBiometricLockEnabled() {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
}

export async function setBiometricLockEnabled(enabled: boolean) {
  if (enabled) await AsyncStorage.setItem(ENABLED_KEY, '1');
  else await AsyncStorage.removeItem(ENABLED_KEY);
}

// Nach dem ersten Passwort-Login nur einmal fragen
export async function shouldOfferBiometricLock() {
  if ((await AsyncStorage.getItem(ASKED_KEY)) === '1') return false;
  await AsyncStorage.setItem(ASKED_KEY, '1');
  return (await biometricAvailable()) && !(await isBiometricLockEnabled());
}

export async function authenticateBiometric(promptMessage: string) {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Abbrechen' });
  return result.success;
}
