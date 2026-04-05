import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { mqttService } from '../services/mqttService';

function ControlButtons({ connected }) {
  const [lastAction, setLastAction] = useState(null);
  const [sending, setSending] = useState(false);

  const handleControl = (command, label) => {
    if (!connected) {
      Alert.alert('Không có kết nối', 'Vui lòng đợi kết nối MQTT trước khi điều khiển.');
      return;
    }
    if (sending) return;

    setSending(true);
    mqttService.publishControl(command);
    setLastAction({ label, time: new Date().toLocaleTimeString('vi-VN') });
    setTimeout(() => setSending(false), 1000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎛️ Điều khiển bơm nước</Text>

      {lastAction && (
        <View style={styles.lastAction}>
          <Text style={styles.lastActionText}>
            Lần cuối: {lastAction.label} lúc {lastAction.time}
          </Text>
        </View>
      )}

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnOn, (!connected || sending) && styles.disabled]}
          onPress={() => handleControl('bat_bom', 'Bật bơm')}
          disabled={!connected || sending}
          activeOpacity={0.7}
        >
          <Text style={styles.btnIcon}>💦</Text>
          <Text style={styles.btnText}>Bật bơm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnOff, (!connected || sending) && styles.disabled]}
          onPress={() => handleControl('tat_bom', 'Tắt bơm')}
          disabled={!connected || sending}
          activeOpacity={0.7}
        >
          <Text style={styles.btnIcon}>🛑</Text>
          <Text style={styles.btnText}>Tắt bơm</Text>
        </TouchableOpacity>
      </View>

      {!connected && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>⚠️ Cần kết nối MQTT để điều khiển</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    marginBottom: 4,
  },
  title: {
    color: '#e6edf3',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  lastAction: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  lastActionText: {
    color: '#8b949e',
    fontSize: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnOn: {
    backgroundColor: '#2f9e44',
  },
  btnOff: {
    backgroundColor: '#c92a2a',
  },
  disabled: {
    opacity: 0.4,
  },
  btnIcon: {
    fontSize: 18,
  },
  btnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  warning: {
    marginTop: 12,
    backgroundColor: 'rgba(255,212,59,0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,212,59,0.25)',
  },
  warningText: {
    color: '#ffd43b',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ControlButtons;
