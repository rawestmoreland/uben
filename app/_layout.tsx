import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

import AnimatedSplash from '@/components/animated-splash';
import '@/constants/i18n'; // Initialize i18next before any component renders
import { useAdsInit } from '@/hooks/use-ads-init';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDatabase } from '@/hooks/use-database';
import { purchaseService } from '@/services/purchaseService';
import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isReady, error } = useDatabase();
  useAdsInit();
  const [showingSplash, setShowingSplash] = useState(true);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

    // Prefer per-platform keys if the RevenueCat dashboard has them split;
    // fall back to the shared key so existing single-key setups keep working.
    const iosApiKey =
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ??
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!;
    const androidApiKey =
      process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ??
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY!;

    Purchases.configure({
      apiKey: Platform.OS === 'ios' ? iosApiKey : androidApiKey,
    });

    // Keeps the offline-fast-path entitlement cache in sync when a purchase
    // or restore completes outside this session's own flow (e.g. another
    // device, or directly through the App/Play Store).
    const listener = (customerInfo: CustomerInfo) => {
      purchaseService.syncCustomerInfo(customerInfo).catch((error) => {
        console.error('[App] Failed to sync customer info update:', error);
      });
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  // When splash animation finishes AND database is ready, hide splash
  useEffect(() => {
    if (splashAnimationDone && isReady) {
      setShowingSplash(false);
    }
  }, [splashAnimationDone, isReady]);

  if (error) {
    console.error('[App] Database failed to initialize:', error);
  }

  // Always show splash screen with full animation first
  if (showingSplash) {
    return <AnimatedSplash onFinish={() => setSplashAnimationDone(true)} />;
  }

  return (
    <KeyboardProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="select-categories"
            options={{
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="quiz"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="add-word"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="my-words"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="adjective-quiz"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="paywall"
            options={{
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: 'Modal' }}
          />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </KeyboardProvider>
  );
}
