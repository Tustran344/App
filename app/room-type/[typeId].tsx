import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';

type RoomType = {
  type_id: number;
  name: string;
  base_price: string | number;
  capacity: number;
  amenities_description?: string;
};

type BackendRoom = {
  room_id: number;
  room_number: string;
  status: string;
  type_id: number;
};

type RoomPricingRow = {
  pricing_id: number;
  date: string;
  price_applied: string | number;
};

function formatVND(n: number) {
  try {
    return `${n.toLocaleString('vi-VN')} ₫`;
  } catch {
    return `${n} ₫`;
  }
}

function toISODateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseYYYYMMDD(s: string) {
  // expects yyyy-mm-dd
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function getDaysBetweenInclusiveStart(checkIn: Date, checkOut: Date) {
  // checkout exclusive; nights = days from checkIn to day before checkOut
  const nights: string[] = [];
  let cursor = new Date(checkIn);
  while (cursor < checkOut) {
    nights.push(toISODateOnly(cursor));
    cursor = addDays(cursor, 1);
  }
  return nights;
}

function sanitizeNumberStrDigits(t: string) {
  return t.replace(/[^\d]/g, '');
}

export default function RoomTypeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ typeId: string }>();

  const typeId = Number(params.typeId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [availableRooms, setAvailableRooms] = useState<BackendRoom[]>([]);

  const [checkIn, setCheckIn] = useState(() => toISODateOnly(new Date()));
  const [checkOut, setCheckOut] = useState(() => toISODateOnly(addDays(new Date(), 1)));

  const [promoCode, setPromoCode] = useState('');
  const [promoValid, setPromoValid] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);

  const [computedTotal, setComputedTotal] = useState<number>(0);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Guest info states
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestIdCard, setGuestIdCard] = useState('');
  const [depositAmount, setDepositAmount] = useState('0');

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    async function fillGuestInfo() {
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data) return;

        if (data.full_name) setGuestName((prev) => prev || String(data.full_name));
        if (data.phone) setGuestPhone((prev) => prev || String(data.phone));
        if (data.email) setGuestEmail((prev) => prev || String(data.email));
        if (data.id_card_number) setGuestIdCard((prev) => prev || String(data.id_card_number));
      } catch {
        // ignore fill errors
      }
    }

    fillGuestInfo();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function validatePromo() {
      const code = promoCode.trim().toUpperCase();
      if (!code) {
        setPromoValid(false);
        setPromoDiscount(0);
        setPromoError(null);
        return;
      }

      setPromoLoading(true);
      setPromoError(null);

      try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/promotions/validate?code=${encodeURIComponent(code)}&date=${checkIn}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.valid) {
            setPromoValid(true);
            // Calculate discount based on current total
            const promo = data.promotion;
            let discount = 0;
            if (promo.discount_type === 'percent') {
              discount = (computedTotal * promo.discount_value) / 100;
            } else if (promo.discount_type === 'fixed') {
              discount = promo.discount_value;
            }
            if (promo.max_discount_amount != null) {
              discount = Math.min(discount, promo.max_discount_amount);
            }
            discount = Math.max(0, Math.min(discount, computedTotal));
            setPromoDiscount(discount);
          } else {
            setPromoValid(false);
            setPromoDiscount(0);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setPromoValid(false);
          setPromoDiscount(0);
          setPromoError(String(e?.message || e || 'Promo validation error'));
        }
      } finally {
        if (!cancelled) setPromoLoading(false);
      }
    }

    validatePromo();
    return () => {
      cancelled = true;
    };
  }, [promoCode, checkIn, computedTotal]);

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [typesRes, roomsRes] = await Promise.all([
          fetch(`${BACKEND_BASE_URL}/api/room-types`),
          fetch(`${BACKEND_BASE_URL}/api/rooms`),
        ]);

        if (!typesRes.ok) throw new Error(`HTTP room-types ${typesRes.status}`);
        if (!roomsRes.ok) throw new Error(`HTTP rooms ${roomsRes.status}`);

        const allTypes: any[] = await typesRes.json();
        const rt = allTypes.find((t) => Number(t.type_id) === typeId);
        if (!rt) throw new Error('Room-type not found');

        const roomsData: any[] = await roomsRes.json();
        // roomsData: rooms.*, room_types.name AS room_type_name, room_types.base_price, room_types.capacity
        const av = roomsData
          .filter((r) => Number(r.type_id) === typeId && String(r.status || '').toLowerCase() === 'available')
          .map((r) => ({ room_id: Number(r.room_id), room_number: String(r.room_number), status: String(r.status), type_id: Number(r.type_id) }));

        if (!cancelled) {
          setRoomType({
            type_id: Number(rt.type_id),
            name: String(rt.name),
            base_price: rt.base_price,
            capacity: Number(rt.capacity),
            amenities_description: rt.amenities_description ? String(rt.amenities_description) : '',
          });
          setAvailableRooms(av);
          setSelectedRoomId(av[0]?.room_id ?? null);
        }
      } catch (e: any) {
        if (!cancelled) setError(String(e?.message || e || 'Failed to load room type'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [typeId]);

  // Auto-select first available room
  useEffect(() => {
    if (availableRooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(availableRooms[0].room_id);
    }
  }, [availableRooms, selectedRoomId]);

  const nights = useMemo(() => {
    const inD = parseYYYYMMDD(checkIn);
    const outD = parseYYYYMMDD(checkOut);
    if (!inD || !outD) return 0;
    const diff = outD.getTime() - inD.getTime();
    if (diff <= 0) return 0;
    const dayDiff = diff / (1000 * 60 * 60 * 24);
    return Math.round(dayDiff);
  }, [checkIn, checkOut]);

  const pricingForRange = useMemo(() => {
    const inD = parseYYYYMMDD(checkIn);
    const outD = parseYYYYMMDD(checkOut);
    if (!inD || !outD || nights <= 0) return [] as RoomPricingRow[];

    // Try to fetch pricing for each date range
    // We call once with type_id (server supports type_id + date query separately, but simplest: no date param)
    // and then filter client-side.
    return [] as RoomPricingRow[];
  }, [checkIn, checkOut, nights]);

  const totalWithDiscount = computedTotal - promoDiscount;

  useEffect(() => {
    let cancelled = false;

    async function calc() {
      const inD = parseYYYYMMDD(checkIn);
      const outD = parseYYYYMMDD(checkOut);
      if (!roomType || !inD || !outD || nights <= 0 || !Number.isFinite(typeId)) {
        setComputedTotal(0);
        return;
      }

      setPricingLoading(true);
      setPricingError(null);

      try {
        // Fetch all pricing for type_id then select nights.
        const res = await fetch(`${BACKEND_BASE_URL}/api/room-pricing?type_id=${typeId}`);
        if (!res.ok) throw new Error(`HTTP room-pricing ${res.status}`);
        const rows: any[] = await res.json();

        const nightDates = getDaysBetweenInclusiveStart(inD, outD);
        const basePriceNum = Number(roomType.base_price ?? 0);

        const map = new Map<string, number>();
        for (const row of rows) {
          const dateKey = String(row.date).slice(0, 10);
          map.set(dateKey, Number(row.price_applied));
        }

        const total = nightDates.reduce((sum, day) => {
          const applied = map.has(day) ? map.get(day)! : basePriceNum;
          return sum + applied;
        }, 0);

        if (!cancelled) setComputedTotal(total);
      } catch (e: any) {
        if (!cancelled) {
          setPricingError(String(e?.message || e || 'Pricing error'));
          setComputedTotal(0);
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }

    calc();
    return () => {
      cancelled = true;
    };
  }, [typeId, roomType, checkIn, checkOut, nights]);

  async function confirmBooking() {
    console.log('=== CONFIRM BOOKING DEBUG ===');
    console.log('selectedRoomId:', selectedRoomId);
    console.log('checkIn:', checkIn, 'checkOut:', checkOut);
    console.log('guestName:', guestName, 'guestIdCard:', guestIdCard);

    if (!selectedRoomId) {
      Alert.alert('Chọn phòng để đặt');
      return;
    }
    const inD = parseYYYYMMDD(checkIn);
    const outD = parseYYYYMMDD(checkOut);
    console.log('parsed dates:', inD, outD);
    if (!inD || !outD || inD >= outD) {
      Alert.alert('Ngày không hợp lệ');
      return;
    }

    // Validate guest info
    if (!guestName.trim() || !guestIdCard.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên và số CMND');
      return;
    }

    setBookingLoading(true);
    try {
      const payload = {
        guest: {
          full_name: guestName.trim(),
          phone: guestPhone.trim() || undefined,
          email_contact: guestEmail.trim() || undefined,
          id_card_number: guestIdCard.trim(),
        },
        details: [
          {
            room_id: selectedRoomId,
            check_in_date: checkIn,
            check_out_date: checkOut,
          },
        ],
        promotion_code: promoValid ? promoCode.trim().toUpperCase() : undefined,
        deposit_amount: Number(depositAmount) || 0,
        notes: undefined,
      };

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      const res = await fetch(`${BACKEND_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        const text = await res.text();
        console.log('Response error:', text);
        throw new Error(`Booking failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      console.log('Response data:', data);
      const bookingCode = String(data?.booking_code || '');
      if (!bookingCode) {
        throw new Error('Không nhận được mã booking từ server');
      }

      Alert.alert(
        'Đặt phòng thành công',
        `Mã booking: ${bookingCode}\nBạn sẽ được chuyển sang trang chi tiết đặt phòng.`,
        [
          {
            text: 'Xem chi tiết',
            onPress: () => {
              router.push(`/tabs/booking-details?booking_code=${encodeURIComponent(bookingCode)}`);
            },
          },
        ],
        { cancelable: false }
      );
      setTimeout(() => {
        router.push(`/tabs/booking-details?booking_code=${encodeURIComponent(bookingCode)}`);
      }, 600);
    } catch (e: any) {
      console.log('Booking error:', e);
      Alert.alert('Đặt phòng thất bại', String(e?.message || e || 'Unknown error'));
    } finally {
      setBookingLoading(false);
    }
  }

  const availableRoomCards = useMemo(() => {
    return availableRooms;
  }, [availableRooms]);

  const renderRoom = ({ item }: { item: BackendRoom }) => {
    const selected = item.room_id === selectedRoomId;
    return (
      <Pressable
        onPress={() => setSelectedRoomId(item.room_id)}
        style={({ pressed }) => [styles.roomChip, selected ? styles.roomChipSelected : null, pressed ? { opacity: 0.92 } : null]}
      >
        <Text style={[styles.roomChipText, selected ? { color: '#fff' } : null]}>Phòng {item.room_number}</Text>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color="#93c5fd" />
          <Text style={styles.loadingText}>Đang tải chi tiết…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !roomType) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{roomType.name}</Text>
          {!!roomType.capacity && <Text style={styles.subtitle}>Sức chứa: {roomType.capacity}</Text>}

          {!!roomType.amenities_description ? (
            <Text style={styles.sectionTitle}>Tiện nghi</Text>
          ) : null}
          {!!roomType.amenities_description ? (
            <Text style={styles.bodyText}>{roomType.amenities_description}</Text>
          ) : null}
        </View>

      {/* Date selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tính toán giá</Text>

        <View style={styles.row}>
          <View style={styles.inputLike}>
            <Text style={styles.inputLabel}>Check-in</Text>
            <TextInput
              value={checkIn}
              onChangeText={(text) => {
                // Allow only YYYY-MM-DD format
                const cleaned = text.replace(/[^0-9-]/g, '');
                if (cleaned.length <= 10) {
                  setCheckIn(cleaned);
                }
              }}
              placeholder="2026-01-01"
              style={styles.textInput}
              maxLength={10}
            />
          </View>
          <View style={styles.inputLike}>
            <Text style={styles.inputLabel}>Check-out</Text>
            <TextInput
              value={checkOut}
              onChangeText={(text) => {
                // Allow only YYYY-MM-DD format
                const cleaned = text.replace(/[^0-9-]/g, '');
                if (cleaned.length <= 10) {
                  setCheckOut(cleaned);
                }
              }}
              placeholder="2026-01-02"
              style={styles.textInput}
              maxLength={10}
            />
          </View>
        </View>

        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total amount</Text>
            <Text style={styles.totalValue}>{pricingLoading ? 'Đang tính…' : formatVND(computedTotal)}</Text>
            {promoValid && promoDiscount > 0 && (
              <Text style={styles.discountText}>- {formatVND(promoDiscount)} discount</Text>
            )}
            {promoValid && promoDiscount > 0 && (
              <Text style={styles.finalTotalText}>{formatVND(totalWithDiscount)}</Text>
            )}
            {pricingError ? <Text style={styles.errorInline}>{pricingError}</Text> : null}
            {promoError ? <Text style={styles.errorInline}>{promoError}</Text> : null}
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={styles.inputLabel}>Mã giảm giá {promoLoading ? '(Đang kiểm tra…)' : promoValid ? '(Hợp lệ)' : promoCode ? '(Không hợp lệ)' : ''}</Text>
          <TextInput
            value={promoCode}
            onChangeText={(t) => setPromoCode(sanitizeNumberStrDigits(t) ? t.toUpperCase() : t.toUpperCase())}
            placeholder=""
            style={[styles.textInput, promoValid ? { borderColor: '#10b981' } : promoCode && !promoValid ? { borderColor: '#ef4444' } : null]}
          />
        </View>
      </View>

      {/* Guest Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>

        <View style={styles.inputLike}>
          <Text style={styles.inputLabel}>Họ tên *</Text>
          <TextInput
            value={guestName}
            onChangeText={setGuestName}
            placeholder="Nhập họ tên đầy đủ"
            style={styles.textInput}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.inputLike}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              value={guestPhone}
              onChangeText={setGuestPhone}
              placeholder="0123456789"
              keyboardType="phone-pad"
              style={styles.textInput}
            />
          </View>
          <View style={styles.inputLike}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              value={guestEmail}
              onChangeText={setGuestEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.textInput}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.inputLike}>
            <Text style={styles.inputLabel}>Số CMND/CCCD *</Text>
            <TextInput
              value={guestIdCard}
              onChangeText={setGuestIdCard}
              placeholder="123456789"
              keyboardType="numeric"
              style={styles.textInput}
            />
          </View>
          <View style={styles.inputLike}>
            <Text style={styles.inputLabel}>Đặt cọc (VND)</Text>
            <TextInput
              value={depositAmount}
              onChangeText={(t) => setDepositAmount(sanitizeNumberStrDigits(t))}
              placeholder="0"
              keyboardType="numeric"
              style={styles.textInput}
            />
          </View>
        </View>
      </View>

      {/* Available rooms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chọn phòng Available</Text>

        {availableRoomCards.length === 0 ? (
          <Text style={styles.muted}>Không có phòng Available cho room-type này.</Text>
        ) : (
          <FlatList
            data={availableRoomCards}
            renderItem={renderRoom}
            keyExtractor={(i) => String(i.room_id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
          />
        )}
      </View>

      {/* Confirm */}
      <View style={styles.bottom}>
        <View style={styles.bookingSummary}>
          <Text style={styles.summaryTitle}>Tóm tắt đặt phòng</Text>
          <Text style={styles.summaryText}>Phòng: {availableRooms.find(r => r.room_id === selectedRoomId)?.room_number || 'Chưa chọn'}</Text>
          <Text style={styles.summaryText}>Check-in: {checkIn}</Text>
          <Text style={styles.summaryText}>Check-out: {checkOut}</Text>
          <Text style={styles.summaryText}>Khách: {guestName || 'Chưa nhập'}</Text>
          <Text style={styles.summaryText}>Tổng tiền: {formatVND(totalWithDiscount)}</Text>
          {Number(depositAmount) > 0 && (
            <Text style={styles.summaryText}>Đặt cọc: {formatVND(Number(depositAmount))}</Text>
          )}
        </View>

        <Pressable
          onPress={confirmBooking}
          disabled={bookingLoading}
          style={({ pressed }) => [styles.primaryBtn, pressed ? { opacity: 0.92 } : null, bookingLoading ? { opacity: 0.75 } : null]}
        >
          <Text style={styles.primaryBtnText}>{bookingLoading ? 'Đang đặt…' : 'Xác nhận đặt phòng'}</Text>
        </Pressable>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  loadingText: { color: '#93c5fd', fontWeight: '800', marginTop: 10 },
  errorText: { color: '#fca5a5', fontWeight: '800', textAlign: 'center' },

  header: {
    margin: 12,
    backgroundColor: '#111a2e',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
  },
  title: { color: '#e5e7eb', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#93c5fd', marginTop: 6, fontWeight: '800' },

  section: {
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: { color: '#cbd5e1', fontWeight: '900', marginBottom: 10 },
  bodyText: { color: '#e5e7eb', fontWeight: '700' },

  row: { flexDirection: 'row', gap: 10 },
  inputLike: { flex: 1 },
  inputLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '900', marginBottom: 6 },
  textInput: {
    backgroundColor: '#0b1220',
    color: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  totalRow: { marginTop: 8 },
  totalLabel: { color: '#94a3b8', fontWeight: '900' },
  totalValue: { color: '#e5e7eb', fontSize: 16, fontWeight: '900', marginTop: 6 },
  errorInline: { color: '#fca5a5', fontWeight: '800', marginTop: 8 },
  discountText: { color: '#10b981', fontWeight: '800', marginTop: 4 },
  finalTotalText: { color: '#fbbf24', fontSize: 18, fontWeight: '900', marginTop: 4 },

  muted: { color: '#94a3b8', fontWeight: '800' },

  roomChip: {
    backgroundColor: '#111a2e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  roomChipSelected: { backgroundColor: '#1d4ed8', borderColor: 'rgba(147,197,253,0.35)' },

  roomChipText: { color: '#cbd5e1', fontWeight: '900' },

  bottom: { padding: 12 },
  primaryBtn: {

    backgroundColor: '#1d4ed8',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.25)',
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '900' },

  bookingSummary: {
    backgroundColor: '#111a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryTitle: { color: '#e5e7eb', fontWeight: '900', fontSize: 16, marginBottom: 8 },
  summaryText: { color: '#cbd5e1', fontWeight: '700', fontSize: 14, marginBottom: 4 },
});

