import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { clearToken, getToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';

type BookingRow = {
  booking_id: number;
  booking_code?: string;
  total_amount?: number | string;
  deposit_amount?: number | string;
  status?: string;
  notes?: string;
  full_name?: string;
  phone?: string;
  email_contact?: string;
  id_card_number?: string;
};

function formatVND(n: number) {
  try {
    return `${n.toLocaleString('vi-VN')} ₫`;
  } catch {
    return `${n} ₫`;
  }
}

export default function BookingsReceptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  const token = useMemo(() => getToken(), []);

  function onLogout() {
    clearToken();
    router.replace('/tabs/rooms');
  }

  async function loadBookings() {
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
      setBookings(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(String(e?.message || e || 'Không tải được bookings'));
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(bookingId: number, nextStatus: string) {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error || `HTTP ${res.status}`));

      // Update local state quickly
      setBookings((prev) => prev.map((b) => (b.booking_id === bookingId ? { ...b, status: data?.status || nextStatus } : b)));
    } catch (e: any) {
      Alert.alert('Cập nhật thất bại', String(e?.message || e || 'Unknown error'));
    }
  }

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = bookings.filter((b) => String(b.status || '').toLowerCase() === 'pending');
  const confirmed = bookings.filter((b) => String(b.status || '').toLowerCase() === 'confirmed');
  const checkedIn = bookings.filter((b) => String(b.status || '').toLowerCase() === 'checked_in');
  const checkedOut = bookings.filter((b) => String(b.status || '').toLowerCase() === 'checked_out');

  const Card = ({ item }: { item: BookingRow }) => {
    const status = String(item.status || '');
    const amount = Number(item.total_amount ?? 0);

    const actions: Array<{ label: string; onPress: () => void; show: boolean }> = [
      {
        label: 'Confirm',
        onPress: () => updateStatus(item.booking_id, 'Confirmed'),
        show: status === 'Pending',
      },
      {
        label: 'Check-in',
        onPress: () => updateStatus(item.booking_id, 'Checked_In'),
        show: status === 'Confirmed',
      },
      {
        label: 'Check-out',
        onPress: () => updateStatus(item.booking_id, 'Checked_Out'),
        show: status === 'Checked_In',
      },
    ];

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.full_name || '—'}</Text>
          <View style={[styles.statusPill, status === 'Pending' ? { backgroundColor: '#2563eb' } : status === 'Confirmed' ? { backgroundColor: '#0ea5e9' } : status === 'Checked_In' ? { backgroundColor: '#16a34a' } : { backgroundColor: '#64748b' }]}>
            <Text style={styles.statusPillText}>{status || '—'}</Text>
          </View>
        </View>

        <Text style={styles.cardMeta}>#{item.booking_code || item.booking_id}</Text>
        <Text style={styles.cardMeta}>Room(s): (tải từ booking details – có thể mở sau)</Text>
        <Text style={styles.cardMeta}>Tổng: {formatVND(Number.isFinite(amount) ? amount : 0)}</Text>

        <View style={styles.actionsRow}>
          {actions
            .filter((a) => a.show)
            .map((a) => (
              <Pressable key={a.label} onPress={a.onPress} style={({ pressed }) => [styles.actionBtn, pressed ? { opacity: 0.85 } : null]}>
                <Text style={styles.actionBtnText}>{a.label}</Text>
              </Pressable>
            ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Bookings Management</Text>
          <Text style={styles.subtitle}>Reception thao tác Pending → Confirmed → Check-in → Check-out</Text>
        </View>
        <Pressable onPress={onLogout} style={({ pressed }) => [styles.logoutButton, pressed ? { opacity: 0.8 } : null]}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#93c5fd" />
          <Text style={styles.loadingText}>Đang tải bookings…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => String(item.booking_id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.statsWrap}>
              <Text style={styles.statsText}>Pending: {pending.length} • Confirmed: {confirmed.length} • Checked-in: {checkedIn.length}</Text>
              <Text style={styles.statsTextMuted}>Checked-out: {checkedOut.length}</Text>
            </View>
          }
          renderItem={({ item }) => <Card item={item} />}
          refreshing={loading}
          onRefresh={loadBookings}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { color: '#93c5fd', fontWeight: '800', fontSize: 13 },
  errorText: { color: '#fca5a5', fontWeight: '900', fontSize: 13, paddingHorizontal: 16, textAlign: 'center' },
  listContent: { padding: 16, gap: 12 },
  statsWrap: { marginBottom: 10 },
  statsText: { color: '#e5e7eb', fontWeight: '800' },
  statsTextMuted: { color: '#94a3b8', fontWeight: '700', marginTop: 6 },
  card: { backgroundColor: '#0f172a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  cardTitle: { color: '#e5e7eb', fontSize: 14, fontWeight: '900' },
  cardMeta: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 6 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillText: { color: '#ffffff', fontWeight: '900', fontSize: 11 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: { backgroundColor: '#1d4ed8', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  actionBtnText: { color: '#ffffff', fontWeight: '900' },
});

