import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';

type Room = {
  room_id: number;
  room_number: string;
  status: string;
  type_id: number;
  room_type_name?: string;
};

type RoomType = {
  type_id: number;
  name: string;
};

export default function RoomsScreen() {
  const token = useMemo(() => getToken(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomTypeId, setNewRoomTypeId] = useState('');

  async function loadRoomsData() {
    if (!token) {
      setError('Chưa đăng nhập / thiếu token');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [rtRes, rRes] = await Promise.all([
        fetch(`${BACKEND_BASE_URL}/api/room-types`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${BACKEND_BASE_URL}/api/rooms`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const rtData = await rtRes.json().catch(() => []);
      const rData = await rRes.json().catch(() => []);

      if (!rtRes.ok) throw new Error(String(rtData?.error || `HTTP ${rtRes.status}`));
      if (!rRes.ok) throw new Error(String(rData?.error || `HTTP ${rRes.status}`));

      setRoomTypes(Array.isArray(rtData) ? rtData : []);
      setRooms(Array.isArray(rData) ? rData : []);
      const firstTypeId = Array.isArray(rtData) && rtData[0]?.type_id ? String(rtData[0].type_id) : '';
      setNewRoomTypeId((prev) => (prev ? prev : firstTypeId));
    } catch (e: any) {
      setError(String(e?.message || e || 'Không tải được danh sách phòng'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoomsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createRoom() {
    if (!token) return;
    if (!newRoomNumber.trim() || !newRoomTypeId.trim()) {
      Alert.alert('Thiếu dữ liệu', 'room_number và type_id là bắt buộc');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          room_number: newRoomNumber.trim(),
          type_id: Number(newRoomTypeId),
          status: 'Available',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error || `HTTP ${res.status}`));
      setNewRoomNumber('');
      await loadRoomsData();
    } catch (e: any) {
      Alert.alert('Tạo thất bại', String(e?.message || e));
    }
  }

  const RoomCard = ({ item }: { item: Room }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Phòng {item.room_number}</Text>
      <Text style={styles.cardMeta}>Loại: {item.room_type_name || item.type_id}</Text>
      <Text style={styles.cardMeta}>Trạng thái: {item.status}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#93c5fd" />
          <Text style={styles.loadingText}>Đang tải…</Text>
        </View>
      ) : (
        <View style={styles.container}>
          <Text style={styles.title}>Quản lý Phòng</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Thêm Phòng</Text>
            <TextInput style={styles.input} placeholder="room_number" value={newRoomNumber} onChangeText={setNewRoomNumber} />
            <TextInput style={styles.input} placeholder="type_id" value={newRoomTypeId} onChangeText={setNewRoomTypeId} keyboardType="numeric" />
            <Pressable onPress={createRoom} style={({ pressed }) => [styles.btn, pressed ? { opacity: 0.9 } : null]}>
              <Text style={styles.btnText}>Tạo phòng</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Danh sách Phòng</Text>
          <FlatList data={rooms} keyExtractor={(i) => String(i.room_id)} renderItem={({ item }) => <RoomCard item={item} />} contentContainerStyle={{ gap: 12 }} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { color: '#93c5fd', fontWeight: '900' },
  title: { color: '#e5e7eb', fontWeight: '900', fontSize: 18, marginBottom: 8 },
  errorText: { color: '#fca5a5', fontWeight: '800', marginBottom: 8 },
  block: { backgroundColor: '#0f172a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 14 },
  blockTitle: { color: '#93c5fd', fontWeight: '900', fontSize: 14, marginBottom: 10 },
  input: { backgroundColor: '#0b1220', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, color: '#e5e7eb', fontWeight: '800', marginTop: 10 },
  btn: { marginTop: 12, backgroundColor: '#0ea5e9', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#0b1220', fontWeight: '900' },
  sectionTitle: { color: '#cbd5e1', fontWeight: '900', marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: '#0f172a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  cardTitle: { color: '#e5e7eb', fontWeight: '900', fontSize: 14 },
  cardMeta: { color: '#94a3b8', fontWeight: '700', marginTop: 6 },
});
