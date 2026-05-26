import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { C } from '../theme';
import { firebaseService } from '../services/firebaseService';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email.trim() || !password || loading) return;
    setError('');
    if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (password.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
    setLoading(true);
    try {
      await firebaseService.signUp(email.trim(), password);
    } catch (e) {
      const msg = {
        'auth/email-already-in-use': 'Email này đã được sử dụng.',
        'auth/invalid-email': 'Email không hợp lệ.',
        'auth/weak-password': 'Mật khẩu quá yếu.',
      }[e.code] || 'Đăng ký thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🌱</Text>
          </View>
          <Text style={styles.brandTitle}>Smart Garden</Text>
          <Text style={styles.brandSub}>Tạo tài khoản mới</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Đăng ký</Text>
          <Text style={styles.subtitle}>Tạo tài khoản để truy cập dashboard.</Text>

          {[
            { label: 'Email', value: email, setter: setEmail, keyboard: 'email-address', secure: false, placeholder: 'email@example.com' },
            { label: 'Mật khẩu', value: password, setter: setPassword, keyboard: 'default', secure: true, placeholder: 'Tối thiểu 6 ký tự' },
            { label: 'Xác nhận mật khẩu', value: confirm, setter: setConfirm, keyboard: 'default', secure: true, placeholder: 'Nhập lại mật khẩu' },
          ].map((f) => (
            <View key={f.label} style={styles.field}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                placeholderTextColor={C.text3}
                value={f.value}
                onChangeText={f.setter}
                keyboardType={f.keyboard}
                autoCapitalize="none"
                secureTextEntry={f.secure}
              />
            </View>
          ))}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>Tạo tài khoản</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>
              Đã có tài khoản? <Text style={styles.link}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },
  brand: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: C.green, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  logoIcon: { fontSize: 32 },
  brandTitle: { fontSize: 26, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
  brandSub: { fontSize: 13, color: C.text2, marginTop: 4 },
  card: {
    backgroundColor: C.bgCard, borderRadius: C.radius,
    borderWidth: 1, borderColor: C.border, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  title: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: C.text2, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: {
    fontSize: 12, fontWeight: '600', color: C.text2,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7,
  },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15, color: C.text,
  },
  errorBox: {
    backgroundColor: C.redLight, borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 8, padding: 10, marginBottom: 14,
  },
  errorText: { color: C.red, fontSize: 13 },
  btnPrimary: {
    backgroundColor: C.green, borderRadius: 8,
    paddingVertical: 13, alignItems: 'center', marginTop: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  linkRow: { marginTop: 18, alignItems: 'center' },
  linkText: { fontSize: 14, color: C.text2 },
  link: { color: C.greenDark, fontWeight: '600' },
});
