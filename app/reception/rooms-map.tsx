import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { clearToken, getToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';

type RoomRow = {
  room_id?: number;
  room_number?: string;
  roomId?: number;
  soPhong?: number;
  room_type_name?: string;
  typeId?: number;
  base_price?: number;
  gia?: number;
  status?: string;
  trangThai?: string;
};

type RoomMapItem = {
  room_id: number;
  room_number: string;
  room_type_name: string;
  price: number;
  statusNorm: 'available' | 'dirty' | 'out_of_order' | 'booked' | 'occupied' | 'unknown' | string;
};

function normalizeStatus(raw: string | undefined): RoomMapItem['statusNorm'] {
  const s = String(raw || '').toLowerCase();
  if (s.includes('available')) return 'available';
  if (s.includes('dirty')) return 'dirty';
  if (s.includes('out_of_order') || s.includes('out-of-order') || s.includes('out of order')) return 'out_of_order';
  if (s.includes('booked')) return 'booked';
  if (s.includes('occupied')) return 'occupied';
  return 'unknown';
}

function pillColor(status: RoomMapItem['statusNorm']) {
  switch (status) {
    case 'available':
      return '#16a34a';
    case 'dirty':
      return '#ef4444';
    case 'out_of_order':
      return '#f97316';
    case 'booked':
      return '#2563eb';
    case 'occupied':
      return '#f59e0b';
    default:
      return '#64748b';
  }
}

function formatVND(n: number) {
  try {
    return `${n.toLocaleString('vi-VN')} ₫`;
  } catch {
    return `${n} ₫`;
  }
}

export default function RealTimeRoomsMapReceptionScreen() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomMapItem[]>([]);

  function onLogout() {
    clearToken();
    router.replace('/tabs/rooms');
  }

  async function loadRoomsMap() {
    if (!token) {
      setError('Chưa đăng nhập / thiếu token');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // backend chưa có /api/rooms-map, nên tạm gọi /api/rooms
      const res = await fetch(`${BACKEND_BASE_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error || `HTTP ${res.status}`));

      const parsed: RoomMapItem[] = (Array.isArray(data) ? data : []).map((r: RoomRow) => {
        const room_id = Number(r.room_id ?? r.roomId ?? 0);
        const room_number = String(r.room_number ?? r.room_number ?? r.soPhong ?? '');
        const room_type_name = String(r.room_type_name ?? '—');
        const price = Number(r.base_price ?? r.gia ?? 0);
        const statusNorm = normalizeStatus(r.status ?? r.trangThai);
        return { room_id, room_number: room_number || String(room_id), room_type_name, price, statusNorm };
      });

      setRooms(parsed);
    } catch (e: any) {
      setError(String(e?.message || e || 'Không tải được room map'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoomsMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function quickUpdate(roomId: number, nextStatus: 'Dirty' | 'Available' | 'Out_of_order') {
    if (!token) return;
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/rooms/${roomId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error || `HTTP ${res.status}`));

      // optimistic update
      setRooms((prev) =>
        prev.map((x) => (x.room_id === roomId ? { ...x, statusNorm: normalizeStatus(data?.status) } : x))
      );
    } catch (e: any) {
      setError(String(e?.message || e || 'Update thất bại'));
    }
  }

  const RoomCard = ({ item }: { item: RoomMapItem }) => {
    const bg = pillColor(item.statusNorm);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.roomText}>Phòng {item.room_number}</Text>
          <View style={[styles.pill, { backgroundColor: bg }]}>
            <Text style={styles.pillText}>{item.statusNorm.replace(/_/g, ' ')}</Text>
          </View>
        </View>
        <Text style={styles.metaText}>{item.room_type_name}</Text>
        <Text style={styles.metaText}>Giá: {formatVND(item.price)}</Text>

        {item.statusNorm === 'dirty' ? (
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => quickUpdate(item.room_id, 'Available')}
              style={({ pressed }) => [styles.actionBtn, pressed ? { opacity: 0.9 } : null]}
            >
              <Text style={styles.actionBtnText}>Dirty → Available</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Real-time Room Map</Text>
          <Text style={styles.subtitle}>Màu theo status rooms.status: Available / Dirty / Out_of_order</Text>
        </View>
        <Pressable onPress={onLogout} style={({ pressed }) => [styles.logoutButton, pressed ? { opacity: 0.8 } : null]}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#93c5fd" />
          <Text style={styles.loadingText}>Đang tải sơ đồ phòng…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => String(item.room_id)}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          renderItem={({ item }) => <RoomCard item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Không có dữ liệu</Text>
              <Text style={styles.emptySub}>Khởi tạo DB và thêm rooms trước.</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={loadRoomsMap}
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
  emptyWrap: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyTitle: { color: '#e5e7eb', fontWeight: '900' },
  emptySub: { color: '#94a3b8', fontWeight: '700', textAlign: 'center' },
  card: { flex: 1, backgroundColor: '#0f172a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' },
  roomText: { color: '#e5e7eb', fontWeight: '900', fontSize: 13 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  metaText: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginTop: 6 },
  actionsRow: { flexDirection: 'column', gap: 8, marginTop: 12 },
  actionBtn: { backgroundColor: '#ef4444', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  actionBtnGhost: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  actionBtnGhostText: { color: '#bfdbfe', fontWeight: '900', fontSize: 12 },
});

