import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TEAL = '#00C8B3';
const ORANGE = '#FF9500';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const bottomPad = Platform.OS === 'web' ? 8 : insets.bottom;
  const TAB_HEIGHT = 60;

  const tabItems = [
    { name: 'index', label: 'Ana Sayfa', icon: 'home' },
    { name: 'islerim', label: 'İşlerim', icon: 'briefcase' },
    { name: 'bildirimler', label: 'Bildirimler', icon: 'bell' },
  ];

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#2C2C2C',
          paddingBottom: bottomPad,
          height: TAB_HEIGHT + bottomPad,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Ana sayfa */}
        {(() => {
          const item = tabItems[0]!;
          const idx = state.routes.findIndex((r) => r.name === item.name);
          const focused = state.index === idx;
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => !focused && navigation.navigate(item.name)}
              activeOpacity={0.7}
              style={styles.tab}
            >
              <Feather
                name={item.icon as any}
                size={22}
                color={focused ? TEAL : '#6B6B6B'}
              />
              <Text style={[styles.label, { color: focused ? TEAL : '#6B6B6B' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })()}

        {/* Ortadaki büyük teal + butonu */}
        <TouchableOpacity
          onPress={() => router.push('/talep')}
          activeOpacity={0.85}
          style={styles.centerBtnWrap}
        >
          <View style={[styles.centerBtn, { backgroundColor: TEAL }]}>
            <Feather name="plus" size={28} color="#121212" />
          </View>
          <Text style={[styles.label, { color: TEAL, marginTop: 2 }]}>Talep</Text>
        </TouchableOpacity>

        {/* İşlerim */}
        {(() => {
          const item = tabItems[1]!;
          const idx = state.routes.findIndex((r) => r.name === item.name);
          const focused = state.index === idx;
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => !focused && navigation.navigate(item.name)}
              activeOpacity={0.7}
              style={styles.tab}
            >
              <Feather
                name={item.icon as any}
                size={22}
                color={focused ? TEAL : '#6B6B6B'}
              />
              <Text style={[styles.label, { color: focused ? TEAL : '#6B6B6B' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })()}
        {/* Bildirimler */}
        {(() => {
          const item = tabItems[2]!;
          const idx = state.routes.findIndex((r) => r.name === item.name);
          const focused = state.index === idx;
          return (
            <TouchableOpacity
              key={item.name}
              onPress={() => !focused && navigation.navigate(item.name)}
              activeOpacity={0.7}
              style={styles.tab}
            >
              <Feather name={item.icon as any} size={22} color={focused ? TEAL : '#6B6B6B'} />
              <Text style={[styles.label, { color: focused ? TEAL : '#6B6B6B' }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })()}
        {/* Hesabım */}
        <TouchableOpacity
          onPress={() => router.push('/ayarlar')}
          activeOpacity={0.7}
          style={styles.tab}
        >
          <Feather name="user" size={22} color="#6B6B6B" />
          <Text style={[styles.label, { color: '#6B6B6B' }]}>Hesabım</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  centerBtnWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    shadowColor: '#00C8B3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
});
