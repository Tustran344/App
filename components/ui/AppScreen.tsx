import React from 'react';
import { SafeAreaView, StyleProp, ViewStyle } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type AppScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppScreen({ children, style }: AppScreenProps) {
  const bg = useThemeColor({ light: '#f8fafc', dark: '#0b1220' }, 'background');

  return <SafeAreaView style={[{ flex: 1, backgroundColor: bg }, style]}>{children}</SafeAreaView>;
}

