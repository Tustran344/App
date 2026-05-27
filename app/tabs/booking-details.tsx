import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';
import { ui } from '@/constants/ui';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type Booking = any;
type BookingDetail = any;

type BookingWithDetails = {
  booking: Booking;
  details: BookingDetail[];
};

function useFadeSlideScaleIn(deps: any[]) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(10);
    scale.setValue(0.98);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ui.animation.durationFast,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ui.animation.durationFast,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: ui.animation.durationFast,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    opacity,
    transform: [
      { translateY: translateY as any },
      { scale: scale as any },
    ],
  };
}

const Header = memo(function Header() {
  const subtitleColor = useThemeColor({ light: '#64748b', dark: '#94a3b8' }, 'text');

  return (
    <View style={styles.header}>
      <ThemedText type="title" lightColor={Colors.light.text} darkColor={Colors.dark.text}>
        Xem chi tiết booking
      </ThemedText>
      <ThemedText
        type="subtitle"
        style={[styles.subtitle, { color: subtitleColor }]}
      >
        Tự động hiển thị chi tiết booking theo <ThemedText style={styles.codeInline}>booking_code</ThemedText>.
        {"\n"}Nếu bạn đã đăng nhập, hệ thống có thể hiển thị toàn bộ booking.
      </ThemedText>
    </View>
  );
});

const PillText = memo(function PillText({ text }: { text: string }) {
  const bg = useThemeColor({ light: '#e0f2fe', dark: '#0b2a3f' }, 'background');
  const fg = useThemeColor({ light: '#075985', dark: '#7dd3fc' }, 'text');

  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: fg }]}
    >
      <ThemedText style={{ color: fg, fontWeight: '700' }}>{text}</ThemedText>
    </View>
  );
});

const InfoCard = memo(function InfoCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const cardBg = useThemeColor({ light: '#ffffff', dark: '#0f172a' }, 'background');
  const border = useThemeColor({ light: '#e2e8f0', dark: 'rgba(148,163,184,0.18)' }, 'icon');

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
      {title ? <ThemedText type="defaultSemiBold" style={styles.cardTitle}>{title}</ThemedText> : null}
      {children}
    </View>
  );
});

const StateBlock = memo(function StateBlock({
  kind,
  message,
  onRetry,
}: {
  kind: 'loading' | 'error' | 'empty';
  message?: string;
  onRetry?: () => void;
}) {
  // Hooks must not be called conditionally.
  const fgError = useThemeColor({ light: '#b91c1c', dark: '#fca5a5' }, 'text');
  const fgMuted = useThemeColor({ light: '#475569', dark: '#94a3b8' }, 'text');
  const accent = useThemeColor({ light: '#0a7ea4', dark: '#38bdf8' }, 'tint');

  const fg = kind === 'error' ? fgError : fgMuted;

  if (kind === 'loading') {
    return (
      <InfoCard>
        <View style={styles.stateRow}>
          <ActivityIndicator size="small" color={accent} />
          <ThemedText style={{ color: fg, fontWeight: '700' }}>Đang tải dữ liệu...</ThemedText>
        </View>
      </InfoCard>
    );
  }

  if (kind === 'error') {
    return (
      <InfoCard>
        <ThemedText style={[styles.stateTitle, { color: fg }]}>
          Có lỗi xảy ra
        </ThemedText>
        {message ? (
          <ThemedText style={[styles.stateMessage, { color: fg }]}>{message}</ThemedText>
        ) : null}
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <ThemedText style={styles.buttonText}>Thử lại</ThemedText>
          </Pressable>
        ) : null}
      </InfoCard>
    );
  }

  return (
    <InfoCard>
      <ThemedText style={[styles.stateTitle, { color: fg }]}>Không có dữ liệu</ThemedText>
      {message ? (
        <ThemedText style={[styles.stateMessage, { color: fg }]}>{message}</ThemedText>
      ) : null}
    </InfoCard>
  );
});


const FieldRow = memo(function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <View style={styles.fieldRow}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <ThemedText style={styles.fieldValue}>{value}</ThemedText>
    </View>
  );
});

const BookingSummaryCard = memo(function BookingSummaryCard({
  booking,
}: {
  booking: Booking;
}) {
  return (
    <InfoCard title="Thông tin booking">
      <View style={styles.grid2}>
        <FieldRow label="Mã code" value={booking?.booking_code ?? '—'} />
        <FieldRow label="Trạng thái" value={booking?.status ?? '—'} />
        <FieldRow label="Tổng tiền" value={booking?.total_amount ?? '—'} />
        <FieldRow label="Đặt cọc" value={booking?.deposit_amount ?? '—'} />
        <FieldRow label="Khách" value={booking?.full_name ?? '—'} />
        <FieldRow label="Email" value={booking?.email_contact ?? '—'} />
        <FieldRow label="SĐT" value={booking?.phone ?? '—'} />
        <FieldRow label="Ghi chú" value={booking?.notes ?? 'Không có'} />
      </View>
    </InfoCard>
  );
});

const RoomDetailsCard = memo(function RoomDetailsCard({
  details,
}: {
  details: BookingDetail[];
}) {
  if (!details?.length) return null;

  return (
    <InfoCard title="Chi tiết phòng">
      <View style={styles.list}>
        {details.map((d: any, idx: number) => (
          <View key={idx} style={styles.listItem}>
            <ThemedText type="defaultSemiBold" style={styles.listItemTitle}>
              Phòng {d?.room_number ?? '—'}
            </ThemedText>
            <View style={styles.grid2}>
              <FieldRow label="Loại" value={d?.room_type_name ?? '—'} />
              <FieldRow label="Nhận phòng" value={d?.check_in_date ?? '—'} />
              <FieldRow label="Trả phòng" value={d?.check_out_date ?? '—'} />
              <View />
            </View>
          </View>
        ))}
      </View>
    </InfoCard>
  );
});

function AnimatedContainer({
  children,
  style,
  deps,
}: {
  children: React.ReactNode;
  style?: any;
  deps: any[];
}) {
  const anim = useFadeSlideScaleIn(deps);
  return (
    <Animated.View style={[style, anim]}>{children}</Animated.View>
  );
}

export default function BookingDetailsScreen() {
  const params = useLocalSearchParams<{ booking_code?: string }>();
  const bookingCode = String(params.booking_code || '').trim();

  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [details, setDetails] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useMemo(() => getToken(), []);

  const pageBg = useThemeColor({ light: '#f8fafc', dark: '#0b1220' }, 'background');

  async function loadBooking(code: string) {
    setLoading(true);
    setError(null);
    setBooking(null);
    setDetails([]);
    setBookings([]);

    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/bookings/code/${encodeURIComponent(code)}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Không lấy được chi tiết booking');
      }

      setBooking(data.booking);
      setDetails(data.details ?? []);
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi tải dữ liệu booking.');
    } finally {
      setLoading(false);
    }
  }

  async function loadAllBookings(currentToken: string) {
    setLoading(true);
    setError(null);
    setBooking(null);
    setDetails([]);
    setBookings([]);

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Không lấy được danh sách booking');
      }

      if (!Array.isArray(data)) {
        throw new Error('Dữ liệu booking không hợp lệ');
      }

      const bookingsWithDetails = await Promise.all(
        data.map(async (item: any) => {
          const detailsRes = await fetch(
            `${BACKEND_BASE_URL}/api/bookings/${item.booking_id}`,
            {
              headers: { Authorization: `Bearer ${currentToken}` },
            }
          );
          const detailsData = await detailsRes.json();
          if (!detailsRes.ok) {
            throw new Error(detailsData?.error || 'Không lấy được chi tiết booking');
          }
          return {
            booking: detailsData.booking,
            details: detailsData.details ?? [],
          };
        })
      );

      setBookings(bookingsWithDetails);
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi tải danh sách booking.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadAllBookings(token);
    } else if (bookingCode) {
      loadBooking(bookingCode);
    }
  }, [bookingCode, token]);


  const stateMessage = useMemo(() => {
    if (token) return 'Bạn chưa có booking nào.';
    if (!bookingCode) return 'Vui lòng mở trang với booking_code trong URL.';
    return 'Không tìm thấy booking theo mã đã cung cấp.';
  }, [token, bookingCode]);

  const headerPills = useMemo(() => {
    if (token) return 'Chế độ tài khoản';
    if (bookingCode) return `Mã: ${bookingCode}`;
    return 'Chế độ xem nhanh';
  }, [token, bookingCode]);

  const content = (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Header />

      <View style={styles.pillsRow}>
        <PillText text={headerPills} />
      </View>

      {!loading && !error ? (
        token ? (
          <ThemedText style={styles.note}>
            Bạn đã đăng nhập. Hiển thị tất cả booking của bạn.
          </ThemedText>
        ) : bookingCode ? (
          <ThemedText style={styles.note}>
            Đang hiển thị chi tiết booking cho mã: {bookingCode}
          </ThemedText>
        ) : (
          <ThemedText style={styles.note}>
            Không có mã booking. Vui lòng mở trang với booking_code trong URL.
          </ThemedText>
        )
      ) : null}

      {error ? (
        <AnimatedContainer deps={[error]}>
          <StateBlock kind="error" message={error} onRetry={() => (token ? loadAllBookings(token) : bookingCode ? loadBooking(bookingCode) : null)} />
        </AnimatedContainer>
      ) : null}

      {loading ? (
        <AnimatedContainer deps={[loading]}>
          <StateBlock kind="loading" />
        </AnimatedContainer>
      ) : null}

      {!loading && !error ? (
        token ? (
          bookings.length ? (
            bookings.map((b, idx) => (
              <AnimatedContainer key={`${b.booking?.booking_id ?? 'x'}-${idx}`} deps={[b.booking?.booking_id, b.details?.length]}>
                <InfoCard title={`Booking #${b.booking?.booking_id ?? '—'}`}>
                  <View style={styles.grid2}>
                    <FieldRow label="Mã code" value={b.booking?.booking_code ?? '—'} />
                    <FieldRow label="Trạng thái" value={b.booking?.status ?? '—'} />
                    <FieldRow label="Tổng tiền" value={b.booking?.total_amount ?? '—'} />
                    <FieldRow label="Đặt cọc" value={b.booking?.deposit_amount ?? '—'} />
                    <FieldRow label="Khách" value={b.booking?.full_name ?? '—'} />
                    <FieldRow label="Email" value={b.booking?.email_contact ?? '—'} />
                    <FieldRow label="SĐT" value={b.booking?.phone ?? '—'} />
                    <FieldRow label="Ghi chú" value={b.booking?.notes ?? 'Không có'} />
                  </View>
                  <RoomDetailsCard details={b.details} />
                </InfoCard>
              </AnimatedContainer>
            ))
          ) : (
            <AnimatedContainer deps={[bookings.length]}>
              <StateBlock kind="empty" message={stateMessage} />
            </AnimatedContainer>
          )
        ) : booking ? (
          <>
            <AnimatedContainer deps={[booking?.booking_id]}>
              <BookingSummaryCard booking={booking} />
            </AnimatedContainer>
            <AnimatedContainer deps={[details?.length]}>
              <RoomDetailsCard details={details} />
            </AnimatedContainer>
          </>
        ) : (
          <AnimatedContainer deps={[bookingCode]}>
            <StateBlock kind="empty" message={stateMessage} />
          </AnimatedContainer>
        )
      ) : null}

      <View style={styles.footerWrap}>
        <ThemedText style={styles.footerText}>
          {token
            ? 'Bạn đang đăng nhập.'
            : 'Bạn chưa đăng nhập. Vẫn xem được chi tiết bằng mã booking.'}
        </ThemedText>
      </View>
    </ScrollView>
  );

  return <SafeAreaView style={[styles.safe, { backgroundColor: pageBg }]}>{content}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 16,
  },
  header: { gap: 10 },
  subtitle: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  codeInline: { fontWeight: '800' },
  pillsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  pill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ui.radius.md,
    alignSelf: 'flex-start',
  },
  note: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  card: {
    borderRadius: ui.radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: ui.border.hairline,
    ...ui.shadow.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 10,
  },
  fieldRow: {
    minWidth: '47%',
    paddingVertical: 2,
    gap: 4,
  },
  fieldLabel: { fontSize: 12, fontWeight: '800', opacity: 0.8 },
  fieldValue: { fontSize: 13, fontWeight: '700', opacity: 0.95 },
  list: { gap: 12 },
  listItem: {
    borderRadius: ui.radius.md,
    padding: 12,
    borderWidth: ui.border.hairline,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(2,6,23,0.02)',
  },
  listItemTitle: { fontSize: 13, marginBottom: 8 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stateTitle: { fontSize: 14, fontWeight: '900', marginBottom: 6 },
  stateMessage: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: ui.radius.md,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '900' },
  footerWrap: { paddingTop: 4 },
  footerText: { fontSize: 12, fontWeight: '700', opacity: 0.9 },
});


