import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BACKEND_BASE_URL } from '../lib/backend';

type BackendRoom = {
  room_id?: number | string;
  id?: number | string;
  room_number?: number;
  roomNo?: number;
  so_phong?: number;
  soPhong?: number;
  room_type_name?: string;
  room_type?: string;
  type_name?: string;
  loaiPhong?: string;
  base_price?: number;
  gia?: number;
  price?: number;
  capacity?: number;
  status?: string;
  trangThai?: string;
};

type RoomStatus = 'Available' | 'Booked' | 'Cleaning' | string;

type Room = {
  id: string;
  roomId: number;
  typeId: number;
  soPhong: number;
  capacity: number;

  loaiPhong: string;
  gia: number;
  status: RoomStatus;
};

function formatVND(n: number) {
  try {
    return `${n.toLocaleString('vi-VN')} ₫`;
  } catch {
    return `${n} ₫`;
  }
}

function formatDateTime(d: Date) {
  const weekday = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const wd = weekday[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${wd}, ${dd}/${mm} • ${hh}:${mi}`;
}

function parseRoom(r: BackendRoom): Room {
  const id = String(r.room_id ?? r.id ?? r.room_number ?? r.so_phong ?? '');
  const soPhong = Number(r.room_number ?? r.roomNo ?? r.so_phong ?? r.soPhong ?? 0);
  const loaiPhong = String(
    r.room_type_name ?? r.room_type ?? r.type_name ?? r.loaiPhong ?? '—'
  );
  const gia = Number(r.base_price ?? r.gia ?? r.price ?? 0);
  const capacity = Number(r.capacity ?? 0);
  const status = String(r.status ?? r.trangThai ?? '');

  // Map backend status to expected strings.
  // Backend rooms.status uses: 'Available' | 'Dirty' | 'Out_of_order'
  const mappedStatus = (() => {
    const s = String(status).toLowerCase();
    if (s.includes('available')) return 'Available';
    if (s.includes('clean') || s.includes('dirty')) return 'Cleaning';
    return 'Booked';
  })();

  // Defensive: always return a valid Room
  const roomIdNum = Number(r.room_id ?? r.id ?? 0);
  const typeIdNum = Number((r as any).type_id ?? 0);

  return {
    id: id || `${soPhong}-${loaiPhong}`,
    roomId: Number.isFinite(roomIdNum) ? roomIdNum : 0,
    typeId: Number.isFinite(typeIdNum) ? typeIdNum : 0,
    soPhong: Number.isFinite(soPhong) ? soPhong : 0,
    capacity: Number.isFinite(capacity) ? capacity : 0,
    loaiPhong,
    gia: Number.isFinite(gia) ? gia : 0,
    status: mappedStatus,
  };
}

function matchesPrice(room: Room, minPrice: string, maxPrice: string) {
  const min = minPrice.trim() === '' ? null : Number(minPrice);
  const max = maxPrice.trim() === '' ? null : Number(maxPrice);

  if (min !== null && (Number.isNaN(min) || room.gia < min)) return false;
  if (max !== null && (Number.isNaN(max) || room.gia > max)) return false;
  return true;
}

function matchesType(room: Room, roomType: string) {
  const t = roomType.trim();
  if (!t) return true;
  return room.loaiPhong.toLowerCase() === t.toLowerCase();
}

function matchesCapacity(room: Room, capacity: string) {
  const value = capacity.trim();
  if (!value) return true;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return true;
  return room.capacity === parsed;
}

export default function RoomsScreen() {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  // Filters
  const [minPrice, setMinPrice] = useState(''); // string for easy input
  const [maxPrice, setMaxPrice] = useState('');
  const [roomType, setRoomType] = useState('');
  const [capacity, setCapacity] = useState('');

  const { width } = Dimensions.get('window');
  const numColumns = width < 360 ? 2 : width < 480 ? 3 : 4;


  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      setLoading(true);
      setError(null);

      try {
        const query = capacity.trim() ? `?capacity=${encodeURIComponent(capacity.trim())}` : '';
        const res = await fetch(`${BACKEND_BASE_URL}/api/rooms${query}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const parsed: Room[] = (Array.isArray(data) ? data : [])
          .map(parseRoom)
          // CHỈ HIỂN THỊ Available
          .filter((r) => String(r.status || '').toLowerCase() === 'available');

        if (!cancelled) setRooms(parsed);
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e || 'Không tải được dữ liệu'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRooms();
    return () => {
      cancelled = true;
    };
  }, [capacity]);

  const allRoomTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rooms) set.add(r.loaiPhong);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) =>
      matchesPrice(r, minPrice, maxPrice) &&
      matchesType(r, roomType) &&
      matchesCapacity(r, capacity)
    );
  }, [rooms, minPrice, maxPrice, roomType, capacity]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header (tap để “đặt phòng” - placeholder) */}
      <Pressable
        onPress={() => {
          // eslint-disable-next-line no-alert
          alert('Đặt phòng: tính năng demo (đang tập trung dashboard)');
        }}
        style={({ pressed }) => [styles.header, pressed ? { opacity: 0.92 } : null]}
      >
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Khách sạn</Text>
          <Text style={styles.headerSubtitle}>{formatDateTime(now)}</Text>
        </View>
        <View style={styles.headerChip}>
          <Text style={styles.headerChipText}>Tap để đặt</Text>
        </View>
      </Pressable>

      {/* Filters */}
      <View style={styles.filtersWrap}>
        <Text style={styles.sectionTitle}>Tìm phòng</Text>

        <View style={styles.filterRow}>
          <View style={styles.inputLike}>
            <Text style={styles.inputLabel}>Giá tối thiểu</Text>
            <TextInput
              value={minPrice}
              onChangeText={(t) => setMinPrice(t.replace(/[^\d]/g, ''))}
              placeholder="VD: 600000"
              placeholderTextColor="rgba(148,163,184,0.6)"
              keyboardType="numeric"
              style={styles.textInputValue}
            />
          </View>

          <View style={styles.inputLike}>
            <Text style={styles.inputLabel}>Giá tối đa</Text>
            <TextInput
              value={maxPrice}
              onChangeText={(t) => setMaxPrice(t.replace(/[^\d]/g, ''))}
              placeholder="VD: 1200000"
              placeholderTextColor="rgba(148,163,184,0.6)"
              keyboardType="numeric"
              style={styles.textInputValue}
            />
          </View>

          <View style={styles.inputLike}>
            <Text style={styles.inputLabel}>Dung tích</Text>
            <TextInput
              value={capacity}
              onChangeText={(t) => setCapacity(t.replace(/[^\d]/g, ''))}
              placeholder="VD: 2"
              placeholderTextColor="rgba(148,163,184,0.6)"
              keyboardType="numeric"
              style={styles.textInputValue}
            />
          </View>
        </View>

        {/* Minimalism: use quick chips instead of TextInput to keep UI simple */}
        <View style={styles.chipsRow}>
          {[
            { key: 'min0', label: 'Từ 0' , on: () => setMinPrice('0') },
            { key: 'min600', label: '≥ 600k', on: () => setMinPrice('600000') },
            { key: 'min900', label: '≥ 900k', on: () => setMinPrice('900000') },
          ].map((c) => (
            <Pressable key={c.key} onPress={c.on} style={({ pressed }) => [styles.chip, pressed ? { opacity: 0.9 } : null]}>
              <Text style={styles.chipText}>{c.label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              setMinPrice('');
              setMaxPrice('');
            }}
            style={({ pressed }) => [styles.chipGhost, pressed ? { opacity: 0.9 } : null]}
          >
            <Text style={styles.chipGhostText}>Reset giá</Text>
          </Pressable>
        </View>

        <View style={styles.typeWrap}>
          <Text style={styles.inputLabel}>Room-type</Text>
          <View style={styles.typeChipsRow}>
            <Pressable
              onPress={() => setRoomType('')}
              style={({ pressed }) => [styles.chip, pressed ? { opacity: 0.9 } : null, !roomType ? styles.chipSelected : null]}
            >
              <Text style={styles.chipText}>Tất cả</Text>
            </Pressable>
            {allRoomTypes.slice(0, 6).map((t) => {
              const selected = roomType.toLowerCase() === t.toLowerCase();
              return (
                <Pressable
                  key={t}
                  onPress={() => setRoomType(t)}
                  style={({ pressed }) => [styles.chip, pressed ? { opacity: 0.9 } : null, selected ? styles.chipSelected : null]}
                >
                  <Text style={styles.chipText}>{t}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Count */}
      <View style={styles.countWrap}>
        <Text style={styles.countText}>
          {loading ? 'Đang tải…' : `${filteredRooms.length} phòng Available`}
        </Text>
      </View>

      {/* Grid cards */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#93c5fd" />
          <Text style={styles.loadingText}>Đang tải danh sách phòng</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={styles.gridColumnWrapper}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Không có phòng phù hợp</Text>
              <Text style={styles.emptySub}>Thử đổi khoảng giá hoặc room-type.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed ? { opacity: 0.93 } : null]}
              onPress={() => {
                router.push(`/room-type/${item.typeId}`);
              }}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardRoomNo}>Phòng {item.soPhong}</Text>
                <View style={[styles.statusPill, { backgroundColor: '#16a34a' }]}>
                  <Text style={styles.statusPillText}>Available</Text>
                </View>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Loại</Text>
                <Text style={styles.cardValue}>{item.loaiPhong}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Giá</Text>
                <Text style={styles.cardValue}>{formatVND(item.gia)}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Dung tích</Text>
                <Text style={styles.cardValue}>{item.capacity} người</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },

  header: {
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#111a2e',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitleWrap: { gap: 2 },
  headerTitle: { color: '#e5e7eb', fontSize: 16, fontWeight: '800' },
  headerSubtitle: { color: '#93c5fd', fontSize: 13, fontWeight: '700' },

  headerChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(147,197,253,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
  },
  headerChipText: { color: '#bfdbfe', fontSize: 12, fontWeight: '900' },

  filtersWrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionTitle: { color: '#cbd5e1', fontSize: 15, fontWeight: '900', marginBottom: 10 },

  filterRow: { flexDirection: 'row', gap: 10 },
  inputLike: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inputLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  textInputValue: {
    marginTop: 6,
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '900',
    paddingVertical: 0,
    minHeight: 18,
  },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    backgroundColor: '#1d4ed8',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
  chipGhost: {
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipGhostText: { color: '#cbd5e1', fontSize: 12, fontWeight: '900' },

  typeWrap: { marginTop: 12 },
  typeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },

  chipSelected: { backgroundColor: '#0ea5e9' },

  countWrap: { paddingHorizontal: 12, paddingTop: 8 },
  countText: { color: '#e5e7eb', fontSize: 13, fontWeight: '800' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { color: '#93c5fd', fontSize: 13, fontWeight: '800' },
  errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '800', paddingHorizontal: 16, textAlign: 'center' },

  gridContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 },
  gridColumnWrapper: { gap: 10, justifyContent: 'space-between', marginBottom: 10 },

  card: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardRoomNo: { color: '#e5e7eb', fontSize: 13, fontWeight: '900' },

  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusPillText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },

  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  cardLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '900' },
  cardValue: { color: '#e5e7eb', fontSize: 11, fontWeight: '900', textAlign: 'right' },

  emptyWrap: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyTitle: { color: '#e5e7eb', fontSize: 14, fontWeight: '900' },
  emptySub: { color: '#94a3b8', fontSize: 12, fontWeight: '800', textAlign: 'center', paddingHorizontal: 20 },
});
