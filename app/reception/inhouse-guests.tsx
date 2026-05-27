import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { clearToken, getToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';

type GuestRow = {
  guest_id: number;
  full_name: string;
  phone?: string;
  email_contact?: string;
  id_card_number?: string;
  status?: string;
};

export default function InhouseGuestsReceptionScreen() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [query, setQuery] = useState('');

  function onLogout() {
    clearToken();
    router.replace('/tabs/rooms');
  }

  async function loadGuests() {
    if (!token) {
      setError('Chưa đăng nhập / thiếu token');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error || `HTTP ${res.status}`));
      setGuests(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(String(e?.message || e || 'Không tải được guests'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = guests.filter((g) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [g.full_name, g.phone, g.id_card_number, g.email_contact].some((x) => String(x || '').toLowerCase().includes(q));
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Thông tin khách lưu trú</Text>
          <Text style={styles.subtitle}>Tra cứu nhanh theo tên / SĐT / CCCD (dựa trên trạng thái đặt phòng)</Text>
        </View>
        <Pressable onPress={onLogout} style={({ pressed }) => [styles.logoutButton, pressed ? { opacity: 0.8 } : null]}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchLabel}>Tìm kiếm</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="VD: Nguyen / 0900 / 0123"
          placeholderTextColor="rgba(148,163,184,0.6)"
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#93c5fd" />
          <Text style={styles.loadingText}>Đang tải khách…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.guest_id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Không có kết quả</Text>
              <Text style={styles.emptySub}>Thử đổi từ khóa.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusLabel = item.status === 'Checked_In' ? 'IN-HOUSE' : 'OUT-HOUSE';
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{item.full_name}</Text>
                  <View style={[styles.badge, statusLabel === 'IN-HOUSE' ? styles.badgeInHouse : styles.badgeOutHouse]}>
                    <Text style={styles.badgeText}>{statusLabel}</Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>SĐT: {item.phone || '—'}</Text>
                <Text style={styles.cardMeta}>CCCD: {item.id_card_number || '—'}</Text>
                <Text style={styles.cardMeta}>Email: {item.email_contact || '—'}</Text>
              </View>
            );
          }}
          refreshing={loading}
          onRefresh={loadGuests}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  header: { padding: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerTitle: { flex: 1, gap: 4 },
  title: { color: '#e5e7eb', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#93c5fd', fontSize: 12, fontWeight: '700', marginTop: 4, lineHeight: 16 },
  logoutButton: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start' },
  logoutButtonText: { color: '#fff', fontWeight: '900' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 14 },
  searchLabel: { color: '#cbd5e1', fontWeight: '900', fontSize: 12 },
  searchInput: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#e5e7eb',
    fontWeight: '800',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { color: '#93c5fd', fontWeight: '800', fontSize: 13 },
  errorText: { color: '#fca5a5', fontWeight: '900', fontSize: 13, paddingHorizontal: 16, textAlign: 'center' },
  listContent: { padding: 16, gap: 12 },
  emptyWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyTitle: { color: '#e5e7eb', fontWeight: '900' },
  emptySub: { color: '#94a3b8', fontWeight: '700', marginTop: 6 },
  card: { backgroundColor: '#0f172a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  cardName: { color: '#e5e7eb', fontWeight: '900', fontSize: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeInHouse: { backgroundColor: '#16a34a' },
  badgeOutHouse: { backgroundColor: '#475569' },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  cardMeta: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginTop: 6 },
});

