import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { firebaseService } from '../services/firebaseService';
import { useMqtt } from '../MqttContext';

const BG_COLOR    = '#f2f8f4';
const CARD_BG     = '#ffffff';
const CARD_BORDER = '#d4e8dc';
const TEXT_DARK   = '#1a3028';
const TEXT_MED    = '#4a7a5a';

function InfoRow({ label, value }) {
  return (
    <View style={ir.row}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value ?? '—'}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: CARD_BORDER },
  label: { fontSize: 14, color: TEXT_MED },
  value: { fontSize: 14, fontWeight: '600', color: TEXT_DARK, maxWidth: '60%', textAlign: 'right' },
});

function SectionCard({ title, children }) {
  return (
    <View style={sc.card}>
      {title && <Text style={sc.title}>{title}</Text>}
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card:  { marginHorizontal: 20, marginBottom: 14, backgroundColor: CARD_BG, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 18, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4, shadowColor: '#166534', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 11, color: TEXT_MED, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
});

export default function AccountScreen() {
  const [user, setUser]       = useState(null);
  const { mqttStatus }        = useMqtt();

  useEffect(() => {
    const u = firebaseService.getCurrentUser();
    setUser(u);
    const unsub = firebaseService.onAuthStateChanged(setUser);
    return unsub;
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất khỏi tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất', style: 'destructive',
          onPress: async () => {
            try { await firebaseService.signOut(); }
            catch (e) { Alert.alert('Lỗi', e.message); }
          },
        },
      ],
    );
  }, []);

  const createdAt = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : null;

  const lastLogin = user?.metadata?.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const statusDot = mqttStatus === 'online'
    ? { color: '#16a34a', label: '● Trực tuyến' }
    : mqttStatus === 'reconnecting'
    ? { color: '#b45309', label: '◌ Đang kết nối...' }
    : { color: '#dc2626', label: '○ Ngoại tuyến' };

  return (
    <View style={{ flex: 1, backgroundColor: BG_COLOR }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Avatar + name */}
          <View style={{ alignItems: 'center', paddingTop: 28, paddingBottom: 32 }}>
            <View style={av.circle}>
              <Ionicons name="person" size={40} color="#22c55e" />
            </View>
            <Text style={av.email}>{user?.email ?? 'Không có thông tin'}</Text>
            <Text style={[av.status, { color: statusDot.color }]}>{statusDot.label}</Text>
          </View>

          {/* Account info */}
          <View style={s.sectionRow}><Ionicons name="person-circle-outline" size={14} color={TEXT_MED} /><Text style={s.sectionLabel}> THÔNG TIN TÀI KHOẢN</Text></View>
          <SectionCard>
            <InfoRow label="Email"         value={user?.email} />
            <InfoRow label="Ngày tạo"      value={createdAt} />
            <InfoRow label="Đăng nhập lần cuối" value={lastLogin} />
            <InfoRow label="ID tài khoản"  value={user?.uid?.slice(0, 12) + '...'} />
          </SectionCard>

          {/* Device info */}
          <View style={s.sectionRow}><MaterialCommunityIcons name="chip" size={14} color={TEXT_MED} /><Text style={s.sectionLabel}> THIẾT BỊ</Text></View>
          <SectionCard>
            <InfoRow label="Mã thiết bị" value="esp32_01" />
            <InfoRow label="Trạng thái"  value={statusDot.label.replace('● ', '').replace('◌ ', '').replace('○ ', '')} />
          </SectionCard>

          {/* App info */}
          <View style={s.sectionRow}><Ionicons name="information-circle-outline" size={14} color={TEXT_MED} /><Text style={s.sectionLabel}> ỨNG DỤNG</Text></View>
          <SectionCard>
            <InfoRow label="Tên"      value="Smart Garden" />
            <InfoRow label="Phiên bản" value="1.0.0" />
            <InfoRow label="Nền tảng" value="React Native · Expo" />
          </SectionCard>

          {/* Logout button */}
          <View style={{ marginHorizontal: 20, marginTop: 8 }}>
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
              <Text style={[s.logoutTxt, { marginLeft: 8 }]}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const av = StyleSheet.create({
  circle:  { width: 88, height: 88, borderRadius: 44, backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#86efac', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  email:   { fontSize: 16, fontWeight: '600', color: TEXT_DARK, marginBottom: 6 },
  status:  { fontSize: 13, fontWeight: '500' },
});

const s = StyleSheet.create({
  sectionRow:   { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 6 },
  sectionLabel: { fontSize: 11, color: TEXT_MED, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  logoutBtn:    { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  logoutTxt:    { color: '#dc2626', fontSize: 16, fontWeight: '700' },
});
