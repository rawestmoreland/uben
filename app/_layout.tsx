import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import 'react-native-reanimated';

import '@/constants/i18n'; // Initialize i18next before any component renders
import AnimatedSplash from '@/components/animated-splash';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDatabase } from '@/hooks/use-database';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isReady, error } = useDatabase();
  const [showingSplash, setShowingSplash] = useState(true);
  const [splashAnimationDone, setSplashAnimationDone] = useState(false);

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
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
    </KeyboardProvider>
  );
}

