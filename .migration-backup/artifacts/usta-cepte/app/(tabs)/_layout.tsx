import React from 'react';
import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
       <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
       <Tabs.Screen name="islerim" options={{ title: 'İşlerim' }} />
       <Tabs.Screen name="harita" options={{ title: 'Harita' }} />
       <Tabs.Screen name="bildirimler" options={{ title: 'Bildirimler' }} />
    </Tabs>
  );
}
