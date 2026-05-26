import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getChartDatasets, SENSOR_CONFIG } from '../utils/sensorHistory';

const screenWidth = Dimensions.get('window').width - 48;

const chartConfig = {
  backgroundColor: 'transparent',
  backgroundGradientFrom: '#161b22',
  backgroundGradientTo: '#161b22',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(139, 148, 158, ${opacity})`,
  style: { borderRadius: 14 },
  propsForDots: { r: '0' },
  propsForBackgroundLines: {
    stroke: 'rgba(255,255,255,0.06)',
  },
};

function SensorChart({ history }) {
  const chartData = getChartDatasets(history);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📈 Biểu đồ Realtime</Text>

      {!chartData || history.length < 2 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyText}>Đang chờ dữ liệu từ thiết bị...</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={chartData}
            width={Math.max(screenWidth, history.length * 40)}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withShadow={false}
          />
        </ScrollView>
      )}

      <View style={styles.legend}>
        {SENSOR_CONFIG.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.icon} {s.label}</Text>
          </View>
        ))}
      </View>
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
  chart: {
    borderRadius: 12,
  },
  empty: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyText: {
    color: '#8b949e',
    fontSize: 14,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#8b949e',
    fontSize: 12,
  },
});

export default SensorChart;
