import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import {
  hourly24Filled,
  computeYRange,
  seriesMinMax,
  buildOverlayChart,
  dimColor,
  safeNum,
} from '../utils/dayChart';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 52;

/**
 * Biểu đồ 24h trái → phải, kiểu Apple Weather.
 * Ngày chọn: đường sáng + vùng fill. Ngày trước: nét đứt, màu tối.
 */
export default function WeatherDayChart({
  selectedEntries = [],
  compareEntries = [],
  sensorKey,
  color = '#ef4444',
  unit = '',
  showCompare = true,
  compareLabel = 'Hôm qua',
  selectedLabel = 'Hôm nay',
  loading = false,
  liveValue = null,
  fallbackAvg = null,
  height = 210,
  showHero = true,
}) {
  const selectedPts = useMemo(
    () => hourly24Filled(selectedEntries, sensorKey, fallbackAvg),
    [selectedEntries, sensorKey, fallbackAvg],
  );
  const comparePts = useMemo(
    () => hourly24Filled(compareEntries, sensorKey, null),
    [compareEntries, sensorKey],
  );

  const chart = useMemo(
    () => buildOverlayChart(selectedPts, comparePts),
    [selectedPts, comparePts],
  );

  const yMax = useMemo(
    () => computeYRange(selectedPts, showCompare ? comparePts : []),
    [selectedPts, comparePts, showCompare],
  );

  const stats = useMemo(() => seriesMinMax(selectedPts), [selectedPts]);
  const hasData = chart.selectedCount >= 1 || fallbackAvg != null;
  const hasCompare = showCompare && chart.compareCount >= 1;

  const displayVal = safeNum(liveValue) ?? safeNum(fallbackAvg);
  const spacing = Math.max(8, (CHART_W - 32) / 23);
  const dim = dimColor(color, 0.58);

  const dataSet = [];
  if (hasCompare) {
    dataSet.push({
      data: chart.compare,
      color: dim,
      strokeDashArray: [7, 5],
      thickness: 2,
      curved: true,
      hideDataPoints: true,
      zIndex: 1,
    });
  }
  dataSet.push({
    data: chart.selected,
    color,
    thickness: 3,
    curved: true,
    hideDataPoints: true,
    areaChart: true,
    startFillColor: color,
    endFillColor: color,
    startOpacity: 0.32,
    endOpacity: 0.03,
    zIndex: 2,
  });

  return (
    <View style={s.wrap}>
      {showHero && displayVal != null && (
        <View style={s.hero}>
          <Text style={[s.heroVal, { color }]}>
            {displayVal}
            <Text style={s.heroUnit}>{unit}</Text>
          </Text>
          {stats.min != null && stats.max != null && (
            <Text style={s.heroRange}>
              T:{stats.min}{unit}  ·  C:{stats.max}{unit}
            </Text>
          )}
        </View>
      )}

      {(hasCompare || hasData) && (
        <View style={s.legend}>
          {hasCompare && (
            <View style={s.legendItem}>
              <View style={[s.legendDash, { borderColor: dim }]} />
              <Text style={s.legendTxt}>{compareLabel}</Text>
            </View>
          )}
          <View style={s.legendItem}>
            <View style={[s.legendSolid, { backgroundColor: color }]} />
            <Text style={s.legendTxt}>{selectedLabel}</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={color} style={s.loader} />
      ) : !hasData ? (
        <Text style={s.empty}>Chưa có dữ liệu để vẽ biểu đồ</Text>
      ) : (
        <View style={s.chartBox}>
          <LineChart
            dataSet={dataSet}
            width={CHART_W}
            height={height}
            spacing={spacing}
            initialSpacing={12}
            endSpacing={16}
            curved
            maxValue={yMax}
            noOfSections={4}
            yAxisSide="right"
            yAxisTextStyle={s.axisY}
            xAxisLabelTextStyle={s.axisX}
            rulesColor="#dce8e0"
            rulesType="solid"
            xAxisColor="#dce8e0"
            yAxisColor="transparent"
            xAxisThickness={1}
            yAxisThickness={0}
            showVerticalLines
            verticalLinesColor="#e8f0eb"
            verticalLinesSpacing={spacing * 6}
            isAnimated
            animationDuration={550}
            focusEnabled
            showStripOnFocus
            stripColor={color}
            stripOpacity={0.15}
            stripWidth={1}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%' },
  hero: { alignItems: 'center', paddingBottom: 6, paddingTop: 4 },
  heroVal: { fontSize: 44, fontWeight: '200', letterSpacing: -1 },
  heroUnit: { fontSize: 22, fontWeight: '300' },
  heroRange: { fontSize: 13, color: '#8ab49a', marginTop: 4 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDash: { width: 18, height: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  legendSolid: { width: 18, height: 3, borderRadius: 2 },
  legendTxt: { fontSize: 11, color: '#8ab49a' },
  chartBox: { alignItems: 'center', marginTop: 4 },
  loader: { paddingVertical: 48 },
  empty: { textAlign: 'center', color: '#8ab49a', fontSize: 13, paddingVertical: 36 },
  axisY: { fontSize: 10, color: '#8ab49a', fontWeight: '500' },
  axisX: { fontSize: 10, color: '#8ab49a', width: 36 },
});
