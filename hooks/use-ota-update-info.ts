import {
  formatOtaUpdateInfo,
  getOtaUpdateInfo,
} from '@/services/otaUpdateInfo';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/**
 * Text describing the OTA update the app is running (`OTA 3f2a9c1b · 2026-11-20`),
 * or null on web, in development and on a store build that hasn't received an
 * update. expo-updates' constants describe the bundle that launched, so they
 * don't change while the app runs and need no state.
 */
export function useOtaUpdateInfo(): string | null {
  if (Platform.OS === 'web' || __DEV__) return null;

  const info = getOtaUpdateInfo({
    isEnabled: Updates.isEnabled,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    updateId: Updates.updateId,
    createdAt: Updates.createdAt,
  });
  return info ? formatOtaUpdateInfo(info) : null;
}
