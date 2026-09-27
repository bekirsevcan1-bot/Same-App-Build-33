import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '@/context/AppContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/** Registers push token once deviceId is available from AppContext */
function PushNotificationRegistrar() {
  const { deviceId } = useApp();
  usePushNotifications(deviceId);
  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F0F0F' } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="usta/[id]"
        options={{ headerShown: false, contentStyle: { backgroundColor: '#0F0F0F' } }}
      />
      <Stack.Screen
        name="talep/[id]"
        options={{ headerShown: false, contentStyle: { backgroundColor: '#0F0F0F' } }}
      />
      <Stack.Screen
        name="talep"
        options={{
          presentation: 'modal',
          headerShown: false,
          contentStyle: { backgroundColor: '#0F0F0F' },
        }}
      />
      <Stack.Screen name="kayit" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="ayarlar" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
            <KeyboardProvider>
              <AppProvider>
                <PushNotificationRegistrar />
                <StatusBar style="light" />
                <RootLayoutNav />
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
