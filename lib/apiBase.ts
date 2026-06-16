import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Resolve the URL for an API route across web + native, dev + prod.
 *  - Web: same-origin relative path (Expo Router server output handles it).
 *  - Native dev: the Metro dev server host (e.g. 192.168.x.x:8081).
 *  - Prod / custom: set EXPO_PUBLIC_API_URL to the deployed origin.
 */
export function apiUrl(path: string): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return `${override.replace(/\/$/, '')}${path}`;
  if (Platform.OS === 'web') return path;
  const host = Constants.expoConfig?.hostUri?.split('?')[0];
  if (host) return `http://${host}${path}`;
  return path;
}

/**
 * Resolve the dedicated backend service base URL.
 *  - Web dev: http://localhost:4000
 *  - Native dev: the dev machine's LAN IP on port 4000
 *  - Prod: set EXPO_PUBLIC_BACKEND_URL to the deployed backend origin.
 */
export function backendUrl(path: string): string {
  const override = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (override) return `${override.replace(/\/$/, '')}${path}`;
  if (Platform.OS === 'web') return `http://localhost:4000${path}`;
  const host = Constants.expoConfig?.hostUri?.split('?')[0]?.split(':')[0];
  if (host) return `http://${host}:4000${path}`;
  return `http://localhost:4000${path}`;
}
