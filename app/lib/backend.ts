import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getHostFromExpoConstants() {
  const hostUri =
    typeof Constants.manifest === 'object' && Constants.manifest?.debuggerHost
      ? Constants.manifest.debuggerHost
      : typeof Constants.expoConfig === 'object' && Constants.expoConfig?.hostUri
      ? Constants.expoConfig.hostUri
      : '';

  if (!hostUri) return null;
  return hostUri.split(':')[0];
}

function normalizeHost(host: string | null) {
  if (!host) return null;
  if (host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

const host = normalizeHost(getHostFromExpoConstants());

export const BACKEND_BASE_URL = (() => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000';
  }

  if (host) {
    return `http://${host}:3000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
})();
