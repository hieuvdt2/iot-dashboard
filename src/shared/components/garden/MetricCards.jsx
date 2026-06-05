import React from 'react';
import { getHourTrend } from '../../hooks/useGardenChartData';
import AppIcon from '../AppIcon';

const ICON_NAMES = {
  temp: 'thermometer',
  soil: 'sprout',
  air: 'wind',
  water: 'droplets',
};

function trendClass(trend) {
  if (!trend) return 'flat';
  if (trend.diff === 0) return 'flat';
  return trend.up ? 'up' : 'down';
}

function trendText(trend, unit) {
  if (!trend) return 'So với 1h trước: —';
  if (trend.diff === 0) return 'Ổn định so với 1h trước';
  return `${trend.label}${unit} so với 1h trước`;
}

function tempStatus(temp, maxTemp) {
  if (temp == null) return null;
  if (temp > maxTemp) return { cls: 'danger', text: 'Quá nóng' };
  if (temp > maxTemp - 3) return { cls: 'warn', text: 'Ấm' };
  return { cls: 'ok', text: 'Bình thường' };
}

function soilStatus(soil, minSoil, targetSoil) {
  if (soil == null) return null;
  if (soil < 30) return { cls: 'danger', text: 'Khô' };
  if (soil < minSoil) return { cls: 'danger', text: 'Cần tưới' };
  if (soil < 50) return { cls: 'warn', text: 'Hơi khô' };
  if (soil > 70) return { cls: 'warn', text: 'Quá ẩm' };
  if (soil >= targetSoil * 0.9) return { cls: 'ok', text: 'Lý tưởng' };
  return { cls: 'ok', text: 'Ổn định' };
}

function airStatus(air, minAirHum) {
  if (air == null) return null;
  if (air < minAirHum - 10) return { cls: 'danger', text: 'Rất khô' };
  if (air < minAirHum) return { cls: 'warn', text: 'Hơi khô' };
  return { cls: 'ok', text: 'Ổn định' };
}

function waterStatus(water, maxWaterDistance) {
  if (water == null) return null;
  if (water > maxWaterDistance) return { cls: 'danger', text: 'Gần cạn' };
  if (water > maxWaterDistance * 0.75) return { cls: 'warn', text: 'Thấp' };
  return { cls: 'ok', text: 'Đủ nước' };
}

const ICON_BG = {
  temp: '#fee2e2',
  soil: '#dcfce7',
  air: '#dbeafe',
  water: '#cffafe',
};

const ICON_COLOR = {
  temp: '#ef4444',
  soil: '#22c55e',
  air: '#38bdf8',
  water: '#38bdf8',
};

export default function MetricCards({
  sensorData,
  hourlyRaw,
  thresholds,
  maxWaterDistance,
}) {
  const temp = sensorData?.nhiet_do ?? null;
  const soil = sensorData?.do_am_dat ?? null;
  const air = sensorData?.do_am_khong_khi ?? null;
  const water = sensorData?.muc_nuoc ?? null;

  const { minSoil = 35, targetSoil = 65, maxTemp = 35, minAirHum = 50 } = thresholds;

  const cards = [
    {
      key: 'temp',
      label: 'Nhiệt độ',
      value: temp != null ? `${temp}°C` : '—',
      icon: ICON_NAMES.temp,
      trend: getHourTrend(hourlyRaw, 'nhiet_do', temp),
      trendUnit: '°C',
      status: tempStatus(temp, maxTemp),
      valueColor: temp != null && temp > maxTemp ? '#dc2626' : undefined,
    },
    {
      key: 'soil',
      label: 'Độ ẩm đất',
      value: soil != null ? `${soil}%` : '—',
      icon: ICON_NAMES.soil,
      trend: getHourTrend(hourlyRaw, 'do_am_dat', soil),
      trendUnit: '%',
      status: soilStatus(soil, minSoil, targetSoil),
      valueColor: soil != null && soil < minSoil ? '#dc2626' : soil != null && soil < 50 ? '#d97706' : undefined,
    },
    {
      key: 'air',
      label: 'Độ ẩm không khí',
      value: air != null ? `${air}%` : '—',
      icon: ICON_NAMES.air,
      trend: getHourTrend(hourlyRaw, 'do_am_khong_khi', air),
      trendUnit: '%',
      status: airStatus(air, minAirHum),
    },
    {
      key: 'water',
      label: 'Mực nước',
      value: water != null ? `${water} cm` : '—',
      icon: ICON_NAMES.water,
      trend: getHourTrend(hourlyRaw, 'muc_nuoc', water),
      trendUnit: ' cm',
      status: waterStatus(water, maxWaterDistance),
      valueColor: water != null && water > maxWaterDistance * 0.75 ? '#d97706' : undefined,
    },
  ];

  return (
    <div className="gd-metrics">
      {cards.map((c) => (
        <article key={c.key} className={`gd-metric-card gd-metric-card--${c.key}`}>
          <div className="gd-metric-head">
            <span className="gd-metric-label">{c.label}</span>
            <span
              className="gd-metric-icon"
              style={{ background: ICON_BG[c.key], color: ICON_COLOR[c.key] }}
            >
              <AppIcon name={c.icon} size={20} color={ICON_COLOR[c.key]} />
            </span>
          </div>
          <div
            className="gd-metric-value"
            style={c.valueColor ? { color: c.valueColor } : undefined}
          >
            {c.value}
          </div>
          <div className={`gd-metric-trend ${trendClass(c.trend)}`}>
            {trendText(c.trend, c.trendUnit)}
          </div>
          {c.status && (
            <span className={`gd-metric-status ${c.status.cls}`}>{c.status.text}</span>
          )}
        </article>
      ))}
    </div>
  );
}
