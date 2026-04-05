import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SENSOR_CONFIG } from '../utils/sensorHistory';

function SensorCard({ sensorData, connected }) {
  return (
    <View style={styles.grid}>
      {SENSOR_CONFIG.map((sensor) => {
        const value =
          sensorData && sensorData[sensor.key] !== undefined
            ? sensorData[sensor.key]
            : null;

        return (
          <View
            key={sensor.key}
            style={[
              styles.card,
              { borderTopColor: sensor.color, borderTopWidth: 3 },
            ]}
          >
            <Text style={styles.icon}>{sensor.icon}</Text>
            <Text style={styles.label}>{sensor.label}</Text>
            <Text style={[styles.value, { color: sensor.color }]}>
              {value !== null ? `${value}` : '--'}
              {value !== null ? (
                <Text style={styles.unit}> {sensor.unit}</Text>
              ) : null}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: connected ? 'rgba(81,207,102,0.15)' : 'rgba(255,107,107,0.15)' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: connected ? '#51cf66' : '#ff6b6b' },
                ]}
              >
                {connected ? 'LIVE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 30,
  },
  label: {
    fontSize: 11,
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
  },
  unit: {
    fontSize: 14,
    fontWeight: '400',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default SensorCard;
