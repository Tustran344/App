import React from 'react';
import { Pressable, StyleProp, TextStyle, ViewStyle } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { ui } from '@/constants/ui';

export type AppButtonProps = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function AppButton({
  title,
  onPress,
  disabled,
  variant = 'primary',
  style,
  textStyle,
}: AppButtonProps) {
  const primary = useThemeColor({ light: '#1d4ed8', dark: '#60a5fa' }, 'tint');
  const danger = useThemeColor({ light: '#ef4444', dark: '#f87171' }, 'tint');
  const ghostBorder = useThemeColor({ light: '#1d4ed8', dark: '#60a5fa' }, 'tint');

  const bg = variant === 'danger' ? danger : variant === 'ghost' ? 'transparent' : primary;
  const borderColor = variant === 'ghost' ? ghostBorder : 'transparent';
  const textColor = variant === 'ghost' ? borderColor : '#ffffff';


  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          borderRadius: ui.radius.md,
          paddingVertical: 14,
          paddingHorizontal: 14,
          alignItems: 'center',
          borderWidth: variant === 'ghost' ? ui.border.hairline : 0,
          backgroundColor: bg,
          borderColor,
          opacity: disabled ? 0.55 : pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <ThemedText
        style={[{ color: textColor, fontWeight: '900' }, textStyle]}
        type="default"
      >
        {title}
      </ThemedText>
    </Pressable>
  );
}

