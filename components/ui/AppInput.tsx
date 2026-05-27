import React, { useMemo } from 'react';
import { TextInput, TextInputProps, Platform, StyleProp, TextStyle } from 'react-native';

import { ui } from '@/constants/ui';
import { useThemeColor } from '@/hooks/use-theme-color';

export type AppInputProps = TextInputProps & {
  containerStyle?: never;
};

export function AppInput({ style, ...props }: AppInputProps) {
  const bg = useThemeColor({ light: '#ffffff', dark: '#0b1220' }, 'background');
  const border = useThemeColor({ light: 'rgba(226,232,240,0.9)', dark: 'rgba(148,163,184,0.18)' }, 'icon');
  const textColor = useThemeColor({ light: '#11181C', dark: '#ECEDEE' }, 'text');
  const placeholderTextColor = useThemeColor(
    { light: 'rgba(100,116,139,0.9)', dark: 'rgba(148,163,184,0.7)' },
    'icon'
  );

  const combinedStyle: StyleProp<TextStyle> = useMemo(
    () => [
      {
        borderRadius: ui.radius.md,
        backgroundColor: bg,
        borderWidth: ui.border.hairline,
        borderColor: border,
        paddingHorizontal: 12,
        paddingVertical: Platform.select({ ios: 12, default: 10 }),
        color: textColor,
        fontWeight: '800',
      },
      style,
    ],
    [bg, border, textColor, style]
  );

  return (
    <TextInput
      {...props}
      style={combinedStyle}
      placeholderTextColor={placeholderTextColor}
    />
  );
}


