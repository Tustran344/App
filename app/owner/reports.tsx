import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { getToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';

export default function OwnerReportsScreen() {
  const token = useMemo(() => getToken(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [revenueTotal, setRevenueTotal] = useState(0);

  async function load() {
    if (!token) {
      setError('Chưa đăng nhập / thiếu token');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // backend có GET /api/bookings, nhưng status cho completed chưa tồn tại trong schema.
      // Ta tạm thống kê tổng_amount theo status !== Cancelled.
      const res = await fetch(`${BACKEND_BASE_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data?.error || `HTTP ${res.status}`));

      const rows = Array.isArray(data) ? data : [];
      const sum = rows.reduce((acc: number, b: any) => {
        const st = String(b?.status || '');
        if (st.toLowerCase().includes('cancel')) return acc;
        const amt = Number(b?.total_amount ?? 0);
        return acc + (Number.isFinite(amt) ? amt : 0);
      }, 0);

      setRevenueTotal(sum);
    } catch (e: any) {
      setError(String(e?.message || e || 'Không tải được báo cáo'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Báo cáo & Đánh giá</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#93c5fd" />
            <Text style={styles.loadingText}>Đang tải…</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Doanh thu (tạm tính)</Text>
            <Text style={styles.bigText}>{revenueTotal.toLocaleString('vi-VN')} ₫</Text>
            <Text style={styles.muted}>
              Backend hiện chưa có endpoint/table reviews, và status &apos;completed&apos; chưa xuất hiện trong schema.
              Phần này tạm cộng total_amount cho các booking không Cancelled.

            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quản lý đánh giá (placeholder)</Text>
          <Text style={styles.muted}>
            Backend hiện chưa có bảng `reviews`/endpoint reviews.
            Khi bổ sung, mình sẽ nối UI để hiển thị phản hồi khách hàng.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  container: { flex: 1, padding: 16 },
  title: { color: '#e5e7eb', fontWeight: '900', fontSize: 18, marginBottom: 10 },
  center: { justifyContent: 'center', alignItems: 'center', gap: 10, flex: 1 },
  loadingText: { color: '#93c5fd', fontWeight: '900' },
  errorText: { color: '#fca5a5', fontWeight: '800' },
  card: { backgroundColor: '#0f172a', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginTop: 12 },
  cardTitle: { color: '#93c5fd', fontWeight: '900', fontSize: 14 },
  bigText: { color: '#e5e7eb', fontWeight: '900', fontSize: 22, marginTop: 10 },
  muted: { color: '#94a3b8', fontWeight: '700', marginTop: 10, lineHeight: 18 },
});

