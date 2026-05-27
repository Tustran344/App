import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppCard } from '@/components/ui/AppCard';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { ui } from '@/constants/ui';

export type StateKind = 'loading' | 'error' | 'empty';

export function StateBlock({
  kind,
  title,
  message,
  onRetry,
}: {
  kind: StateKind;
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const accent = useThemeColor({ light: '#1d4ed8', dark: '#60a5fa' }, 'tint');
  const error = useThemeColor({ light: '#b91c1c', dark: '#fca5a5' }, 'text');
  const muted = useThemeColor({ light: '#475569', dark: '#94a3b8' }, 'text');

  if (kind === 'loading') {
    return (
      <AppCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ActivityIndicator size="small" color={accent} />
          <ThemedText style={{ color: muted, fontWeight: '800' }}>Đang tải dữ liệu…</ThemedText>
        </View>
      </AppCard>
    );
  }

  if (kind === 'error') {
    return (
      <AppCard>
        <ThemedText style={{ color: error, fontWeight: '900', fontSize: 14 }}>{title ?? 'Có lỗi xảy ra'}</ThemedText>
        {message ? <ThemedText style={{ color: error, fontWeight: '800' }}>{message}</ThemedText> : null}
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              {
                marginTop: 12,
                borderRadius: ui.radius.md,
                paddingVertical: 12,
                paddingHorizontal: 14,
                alignItems: 'center',
                backgroundColor: accent,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText style={{ color: '#fff', fontWeight: '900' }}>Thử lại</ThemedText>
          </Pressable>
        ) : null}
      </AppCard>
    );
  }

  return (
    <AppCard>
      <ThemedText style={{ color: muted, fontWeight: '900', fontSize: 14 }}>{title ?? 'Không có dữ liệu'}</ThemedText>
      {message ? <ThemedText style={{ color: muted, fontWeight: '800' }}>{message}</ThemedText> : null}
    </AppCard>
  );
}

