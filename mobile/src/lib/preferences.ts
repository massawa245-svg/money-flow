import AsyncStorage from '@react-native-async-storage/async-storage';

// Lokale Anzeige-Einstellungen (nur auf diesem Gerät)
const HIDE_BALANCE_KEY = 'hide-balance';

export async function isBalanceHidden() {
  return (await AsyncStorage.getItem(HIDE_BALANCE_KEY)) === '1';
}

export async function setBalanceHidden(hidden: boolean) {
  if (hidden) await AsyncStorage.setItem(HIDE_BALANCE_KEY, '1');
  else await AsyncStorage.removeItem(HIDE_BALANCE_KEY);
}
