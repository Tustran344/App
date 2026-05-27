import React from 'react';
import { Tabs } from 'expo-router';

export default function ReceptionTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="rooms-map"
        options={{
          title: 'Sơ đồ phòng',
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
        }}
      />
      <Tabs.Screen
        name="inhouse-guests"
        options={{
          title: 'Khách lưu trú',
        }}
      />
    </Tabs>
  );
}

