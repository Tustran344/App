import React from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type AppHeaderProps = {
  title: string;
  subtitle?: string;
};

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 10 }}>
      <ThemedText type="title" style={{ fontSize: 22, fontWeight: '900' }}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText type="subtitle" style={{ fontSize: 14, fontWeight: '700' }}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

