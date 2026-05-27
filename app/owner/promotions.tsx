import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';

type PromotionRow = {
  promotion_id: number;
  promotion_code: string;
  discount_type: 'percent' | 'fixed' | string;
  discount_value: number | string;
  start_date: string;
  end_date: string;
  max_discount_amount: number | string | null;
  is_active?: boolean;
};

export default function PromotionsOwnerScreen() {
  const token = useMemo(() => getToken(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [startAt, setStartAt] = useState('2026-01-01');
  const [endAt, setEndAt] = useState('2026-12-31');
  const [maxDiscount, setMaxDiscount] = useState('');

  const [list, setList] = useState<PromotionRow[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Backend hiện chỉ có validate endpoint; nên ở đây hiển thị danh sách tạm trống.
      // Bạn có thể mở rộng backend thêm GET /api/promotions.
      setList([]);
    } catch (e: any) {
      setError(String(e?.message || e || 'Không tải được promotions'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate() {
    if (!token) return;
    if (!promoCode.trim()) return Alert.alert('Thiếu dữ liệu', 'promo_code là bắt buộc');
    if (!discountValue.trim()) return Alert.alert('Thiếu dữ liệu', 'discount_value là bắt buộc');

    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        promotion_code: promoCode.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        start_date: startAt,
        end_date: endAt,
        max_discount_amount: maxDiscount.trim() ? Number(maxDiscount) : null,
      };

      // Backend hiện chưa có POST /api/promotions trong server.js (chỉ có validate).
      // Nên ta chỉ để UI tạo, và thông báo placeholder.
      Alert.alert(
        'Placeholder (backend hiện chưa có CRUD promotions)',
        'Backend của bạn hiện mới có POST/validate /api/promotions/validate, chưa có endpoint tạo promotion.'
      );
      setPromoCode('');
    } catch (e: any) {
      setError(String(e?.message || e || 'Không tạo được'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Quản lý Khuyến mại</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Tạo promo_code</Text>
          <TextInput style={styles.input} placeholder="promo_code" value={promoCode} onChangeText={setPromoCode} />

          <View style={styles.row}>
            <Pressable onPress={() => setDiscountType('percent')} style={({ pressed }) => [styles.pill, discountType === 'percent' ? styles.pillSelected : null, pressed ? { opacity: 0.9 } : null]}>
              <Text style={styles.pillText}>%</Text>
            </Pressable>
            <Pressable onPress={() => setDiscountType('fixed')} style={({ pressed }) => [styles.pill, discountType === 'fixed' ? styles.pillSelected : null, pressed ? { opacity: 0.9 } : null]}>
              <Text style={styles.pillText}>Cố định</Text>
            </Pressable>
          </View>

          <TextInput style={styles.input} placeholder="discount_value" value={discountValue} onChangeText={setDiscountValue} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="max_discount_amount (tuỳ chọn)" value={maxDiscount} onChangeText={setMaxDiscount} keyboardType="numeric" />

          <TextInput style={styles.input} placeholder="start_at (YYYY-MM-DD)" value={startAt} onChangeText={setStartAt} />
          <TextInput style={styles.input} placeholder="end_at (YYYY-MM-DD)" value={endAt} onChangeText={setEndAt} />

          <Pressable onPress={onCreate} disabled={loading} style={({ pressed }) => [styles.btn, pressed ? { opacity: 0.9 } : null, loading ? { opacity: 0.7 } : null]}>
            <Text style={styles.btnText}>{loading ? 'Đang xử lý…' : 'Tạo khuyến mại'}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Danh sách promotions</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#93c5fd" />
          </View>
        ) : (
          <FlatList data={list} keyExtractor={(i) => String(i.promotion_id)} renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.promotion_code}</Text>
              <Text style={styles.cardMeta}>{item.discount_type} - {item.discount_value}</Text>
              <Text style={styles.cardMeta}>Từ {item.start_date} đến {item.end_date}</Text>
            </View>
          )} ListEmptyComponent={<Text style={styles.muted}>Chưa có endpoint GET promotions nên đang trống.</Text>} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  container: { flex: 1, padding: 16 },
  center: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  title: { color: '#e5e7eb', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  errorText: { color: '#fca5a5', fontWeight: '800', marginBottom: 8 },
  block: { backgroundColor: '#0f172a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  blockTitle: { color: '#93c5fd', fontWeight: '900', fontSize: 14, marginBottom: 10 },
  input: { backgroundColor: '#0b1220', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, color: '#e5e7eb', fontWeight: '800', marginTop: 10 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pill: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#0b1220', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  pillSelected: { backgroundColor: '#0ea5e9', borderColor: 'transparent' },
  pillText: { color: '#e5e7eb', fontWeight: '900' },
  btn: { marginTop: 14, backgroundColor: '#0ea5e9', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#0b1220', fontWeight: '900' },
  sectionTitle: { color: '#cbd5e1', fontWeight: '900', marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: '#0f172a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginTop: 12 },
  cardTitle: { color: '#e5e7eb', fontWeight: '900' },
  cardMeta: { color: '#94a3b8', fontWeight: '700', marginTop: 6 },
  muted: { color: 'rgba(148,163,184,0.9)', fontWeight: '800' },
  error: { color: '#fca5a5', fontWeight: '900' },
});

