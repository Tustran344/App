import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';

type RoomType = {
  type_id: number;
  name: string;
  base_price: number | string;
  capacity: number | string;
};

export default function RoomTypesScreen() {
  const token = useMemo(() => getToken(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [newBasePrice, setNewBasePrice] = useState('');
  const [newCapacity, setNewCapacity] = useState('');

  async function loadRoomTypes() {
    if (!token) {
      setError('Chưa đăng nhập / thiếu token');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/room-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(String(data?.error || `HTTP ${res.status}`));
      setRoomTypes(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(String(e?.message || e || 'Không tải được danh sách loại phòng'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoomTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createRoomType() {
    if (!token) return;
    if (!newTypeName.trim() || !newBasePrice.trim() || !newCapacity.trim()) {
      Alert.alert('Thiếu dữ liệu', 'name, base_price, capacity là bắt buộc');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_BASE_URL}/api/room-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newTypeName.trim(),
          base_price: Number(newBasePrice),
          capacity: Number(newCapacity),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error || `HTTP ${res.status}`));
      setNewTypeName('');
      setNewBasePrice('');
      setNewCapacity('');
      await loadRoomTypes();
    } catch (e: any) {
      Alert.alert('Tạo thất bại', String(e?.message || e));
    }
  }

  const TypeCard = ({ item }: { item: RoomType }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardMeta}>Giá gốc: {item.base_price}</Text>
      <Text style={styles.cardMeta}>Sức chứa: {item.capacity}</Text>
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
          <Text style={styles.title}>Quản lý Loại phòng</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Thêm Loại phòng</Text>
            <TextInput style={styles.input} placeholder="name" value={newTypeName} onChangeText={setNewTypeName} />
            <TextInput style={styles.input} placeholder="base_price" value={newBasePrice} onChangeText={setNewBasePrice} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="capacity" value={newCapacity} onChangeText={setNewCapacity} keyboardType="numeric" />
            <Pressable onPress={createRoomType} style={({ pressed }) => [styles.btn, pressed ? { opacity: 0.9 } : null]}>
              <Text style={styles.btnText}>Tạo loại phòng</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Danh sách Loại phòng</Text>
          <FlatList data={roomTypes} keyExtractor={(i) => String(i.type_id)} renderItem={({ item }) => <TypeCard item={item} />} contentContainerStyle={{ gap: 12 }} />
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
