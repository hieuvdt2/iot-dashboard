import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

import SensorCard from './src/components/SensorCard';
import SensorChart from './src/components/SensorChart';
import ControlButtons from './src/components/ControlButtons';
import { mqttService } from './src/services/mqttService';
import {
  addToHistory,
  loadHistoryAsync,
  saveHistoryAsync,
  SENSOR_CONFIG,
} from './src/utils/sensorHistory';

export default function App() {
  const [sensorData, setSensorData] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [mqttStatus, setMqttStatus] = useState('connecting');
  const [showHistory, setShowHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistoryAsync().then((saved) => {
      if (saved.length > 0) setHistory(saved);
    });
  }, []);

  const handleSensor = useCallback((data) => {
    setSensorData(data);
    setHistory((prev) => {
      const updated = addToHistory(prev, data);
      saveHistoryAsync(updated);
      return updated;
    });
  }, []);

  const handleConnect = useCallback((status) => {
    setConnected(status);
  }, []);

  const handleStatus = useCallback((status) => {
    setMqttStatus(status);
  }, []);

  useEffect(() => {
    mqttService.on('sensor', handleSensor);
    mqttService.on('connect', handleConnect);
    mqttService.on('status', handleStatus);
    mqttService.connect();

    return () => {
      mqttService.off('sensor', handleSensor);
      mqttService.off('connect', handleConnect);
      mqttService.off('status', handleStatus);
    };
  }, [handleSensor, handleConnect, handleStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const statusConfig = {
    connected: { text: '🟢 Đã kết nối', color: '#51cf66' },
    reconnecting: { text: '🟡 Đang kết nối lại...', color: '#ffd43b' },
    disconnected: { text: '🔴 Mất kết nối', color: '#ff6b6b' },
    error: { text: '🔴 Lỗi kết nối', color: '#ff6b6b' },
    connecting: { text: '🟡 Đang kết nối...', color: '#ffd43b' },
  };
  const currentStatus = statusConfig[mqttStatus] || statusConfig.connecting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" backgroundColor="#0d1117" />
      <StatusBar barStyle="light-content" backgroundColor="#0d1117" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📊 IoT Dashboard</Text>
          <Text style={styles.headerSub}>ESP32 Sensor Monitor</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: `${currentStatus.color}40` }]}>
          <Text style={[styles.statusText, { color: currentStatus.color }]}>
            {currentStatus.text}
          </Text>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4dabf7"
            colors={['#4dabf7']}
          />
        }
      >
        {/* Sensor Cards */}
        <SensorCard sensorData={sensorData} connected={connected} />

        <View style={styles.spacer} />

        {/* Controls */}
        <ControlButtons connected={connected} />

        <View style={styles.spacer} />

        {/* Chart */}
        <SensorChart history={history} />

        <View style={styles.spacer} />

        {/* History Table */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => setShowHistory(!showHistory)}
          >
            <Text style={styles.cardTitle}>🗂️ Lịch sử dữ liệu</Text>
            <Text style={styles.historyCount}>
              {history.length} bản ghi {showHistory ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showHistory && (
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table header */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCell, styles.headerCell, { width: 60 }]}>Thời gian</Text>
                  {SENSOR_CONFIG.map((s) => (
                    <Text key={s.key} style={[styles.tableCell, styles.headerCell, { width: 80 }]}>
                      {s.icon} {s.label}
                    </Text>
                  ))}
                </View>

                {/* Table body */}
                {[...history].reverse().slice(0, 20).map((row, i) => (
                  <View
                    key={i}
                    style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}
                  >
                    <Text style={[styles.tableCell, { width: 60, color: '#8b949e' }]}>
                      {row.time}
                    </Text>
                    {SENSOR_CONFIG.map((s) => (
                      <Text
                        key={s.key}
                        style={[styles.tableCell, { width: 80, color: s.color }]}
                      >
                        {row[s.key] ?? '--'}
                      </Text>
                    ))}
                  </View>
                ))}

                {history.length === 0 && (
                  <View style={styles.noData}>
                    <Text style={styles.noDataText}>Chưa có dữ liệu</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>

        <View style={styles.spacer} />
        <Text style={styles.footer}>IoT Dashboard · ESP32 via MQTT · HiveMQ Cloud</Text>
        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e6edf3',
  },
  headerSub: {
    fontSize: 11,
    color: '#8b949e',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  spacer: {
    height: 14,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  historyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#e6edf3',
    fontSize: 15,
    fontWeight: '600',
  },
  historyCount: {
    color: '#8b949e',
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
  },
  tableRowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginTop: 12,
  },
  tableCell: {
    fontSize: 12,
    color: '#e6edf3',
    paddingHorizontal: 6,
  },
  headerCell: {
    color: '#8b949e',
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noData: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noDataText: {
    color: '#8b949e',
    fontSize: 14,
  },
  footer: {
    textAlign: 'center',
    color: '#8b949e',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
