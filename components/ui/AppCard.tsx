import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { ui } from '@/constants/ui';
import { ThemedText } from '@/components/themed-text';

export type AppCardProps = {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppCard({ title, children, style }: AppCardProps) {
  const cardBg = useThemeColor({ light: '#ffffff', dark: '#0f172a' }, 'background');
  const border = useThemeColor(
    { light: 'rgba(226,232,240,0.9)', dark: 'rgba(148,163,184,0.18)' },
    'icon'
  );

  return (
    <View
      style={[
        {
          borderRadius: ui.radius.lg,
          padding: 16,
          gap: 12,
          borderWidth: ui.border.hairline,
          borderColor: border,
          backgroundColor: cardBg,
          ...ui.shadow.sm,
        },
        style,
      ]}
    >
      {title ? (
        <ThemedText type="defaultSemiBold" style={{ fontSize: 16, fontWeight: '800' }}>
          {title}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

