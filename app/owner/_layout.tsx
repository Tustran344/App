import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { clearToken } from '../lib/auth';

export default function OwnerTabsLayout() {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.replace('/tabs/rooms');
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#0b1220' },
        headerTintColor: '#e5e7eb',
        headerTitleStyle: { fontWeight: '900' },
        headerRight: () => (
          <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen name="room-types" options={{ title: 'Loại phòng' }} />
      <Tabs.Screen name="rooms" options={{ title: 'Phòng' }} />
      <Tabs.Screen name="promotions" options={{ title: 'Khuyến mại' }} />
      <Tabs.Screen name="reports" options={{ title: 'Báo cáo & Đánh giá' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e293b',
    borderRadius: 12,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutText: {
    color: '#f8fafc',
    fontWeight: '800',
  },
});

