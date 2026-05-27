import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getToken, clearToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';

export default function ProfileScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    setToken(t);
    if (t) fetchMe(t);
  }, []);

  async function fetchMe(t: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error || `HTTP ${res.status}`));
      setMe(data);
    } catch (e: any) {
      setError(String(e?.message || e || 'Không thể lấy thông tin'));
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  function goToLogin() {
    router.push('/(auth)/login');
  }

  function onLogout() {
    clearToken();
    setToken(null);
    setMe(null);
    router.replace('/tabs/rooms');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Thông tin cá nhân</Text>

        {!token ? (
          <Pressable onPress={goToLogin} style={styles.button}>
            <Text style={styles.buttonText}>Đăng nhập</Text>
          </Pressable>
        ) : loading ? (
          <ActivityIndicator color="#93c5fd" />
        ) : (
          <View style={{ gap: 8 }}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {me ? (
              <View>
                <Text style={styles.field}>Họ tên: {me.name ?? me.full_name ?? '—'}</Text>
                <Text style={styles.field}>SĐT: {me.phone ?? '—'}</Text>
                <Text style={styles.field}>Email: {me.email ?? '—'}</Text>
                <Text style={styles.field}>Số thẻ: {me.id_card_number ?? '—'}</Text>
              </View>
            ) : (
              <Text style={styles.subtitle}>Không có thông tin người dùng.</Text>
            )}

            <Pressable onPress={onLogout} style={[styles.button, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.buttonText}>Đăng xuất</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  container: { padding: 16, gap: 12 },
  title: { color: '#e5e7eb', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  field: { color: '#e5e7eb', fontWeight: '700', marginVertical: 2 },
  button: {
    backgroundColor: '#93c5fd',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#0b1220', fontWeight: '900' },
  error: { color: '#fca5a5', fontWeight: '800' },
});

