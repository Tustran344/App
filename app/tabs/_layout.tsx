import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Phòng',
        }}
      />

      <Tabs.Screen
        name="booking-details"
        options={{
          title: 'Chi tiết booking',
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Thông tin cá nhân',
        }}
      />
    </Tabs>
  );
}

