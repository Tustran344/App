import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { storeToken, getToken } from '../lib/auth';
import { BACKEND_BASE_URL } from '../lib/backend';

const DEFAULT_ROLE = 'customer';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password) return false;
    if (isRegister) {
      return confirmPassword.length > 0 && password === confirmPassword;
    }
    return true;
  }, [email, password, confirmPassword, isRegister]);

  async function handleAuth() {
    setError(null);

    if (!canSubmit) {
      setError(isRegister ? 'Vui lòng điền đủ thông tin và xác nhận mật khẩu' : 'Vui lòng nhập email và password');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const registerRes = await fetch(`${BACKEND_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, role: DEFAULT_ROLE }),
        });
        const registerData = await registerRes.json().catch(() => ({}));
        if (!registerRes.ok) throw new Error(String(registerData?.error || `HTTP ${registerRes.status}`));

        Alert.alert('Đăng ký thành công', 'Tài khoản của bạn đã được tạo. Tiếp tục đăng nhập.');
      }

      const loginRes = await fetch(`${BACKEND_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) throw new Error(String(loginData?.error || `HTTP ${loginRes.status}`));

      const token = loginData?.token;
      if (!token) throw new Error('Không nhận được token từ server');

      storeToken(token);

      const meRes = await fetch(`${BACKEND_BASE_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = await meRes.json().catch(() => ({}));
      if (!meRes.ok) throw new Error(String(me?.error || `HTTP ${meRes.status}`));

      if (me?.role === 'reception') {
        router.replace('/reception/rooms-map');
      } else if (me?.role === 'owner') {
        router.replace('/owner/room-types');
      } else {
        router.replace('/tabs/profile');
      }
    } catch (e: any) {
      setError(String(e?.message || e || (isRegister ? 'Đăng ký thất bại' : 'Đăng nhập thất bại')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{isRegister ? 'Đăng ký' : 'Đăng nhập'}</Text>
        <Text style={styles.subtitle}>
          {isRegister
            ? `Tạo tài khoản khách hàng mới (role mặc định là ${DEFAULT_ROLE})`
            : 'Sử dụng email và mật khẩu để đăng nhập'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="rgba(148,163,184,0.6)"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="rgba(148,163,184,0.6)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {isRegister ? (
          <TextInput
            style={styles.input}
            placeholder="Xác nhận Password"
            placeholderTextColor="rgba(148,163,184,0.6)"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={handleAuth}
          disabled={!canSubmit || loading}
          style={({ pressed }) => [
            styles.button,
            (!canSubmit || loading) ? { opacity: 0.6 } : null,
            pressed ? { opacity: 0.9 } : null,
          ]}
        >
          {loading ? <ActivityIndicator color="#0b1220" /> : <Text style={styles.buttonText}>{isRegister ? 'Đăng ký' : 'Đăng nhập'}</Text>}
        </Pressable>

        <Pressable onPress={() => setIsRegister((prev) => !prev)} style={({ pressed }) => [styles.link, pressed ? { opacity: 0.8 } : null]}>
          <Text style={styles.linkText}>
            {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
          </Text>
        </Pressable>

        <Text style={styles.debug}>Token đang nhớ (runtime): {getToken() ? 'OK' : 'NONE'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  container: { flex: 1, padding: 16, justifyContent: 'center', gap: 12 },
  title: { color: '#e5e7eb', fontSize: 22, fontWeight: '900' },
  subtitle: { color: '#93c5fd', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#e5e7eb',
    fontWeight: '800',
  },
  error: { color: '#fca5a5', fontWeight: '800' },
  button: {
    backgroundColor: '#93c5fd',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#0b1220', fontSize: 14, fontWeight: '900' },
  link: { marginTop: 8, alignItems: 'center' },
  linkText: { color: '#bfdbfe', fontWeight: '900' },
  debug: { marginTop: 6, color: 'rgba(229,231,235,0.55)', fontWeight: '700', fontSize: 11, textAlign: 'center' },
});

