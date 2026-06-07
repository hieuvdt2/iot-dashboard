import React from 'react';
import AppIcon from './AppIcon';
import { formatWaterPercent } from '../utils/waterLevel';

const SENSOR_CONFIG = [
  {
    key: 'nhiet_do',
    label: 'Nhiệt độ',
    unit: '°C',
    icon: 'thermometer',
    color: '#ff6b6b',
    bg: 'rgba(255,107,107,0.08)',
  },
  {
    key: 'do_am_khong_khi',
    label: 'Độ ẩm KK',
    unit: '%',
    icon: 'droplets',
    color: '#4dabf7',
    bg: 'rgba(77,171,247,0.08)',
  },
  {
    key: 'do_am_dat',
    label: 'Độ ẩm đất',
    unit: '%',
    icon: 'sprout',
    color: '#51cf66',
    bg: 'rgba(81,207,102,0.08)',
  },
  {
    key: 'anh_sang',
    label: 'Ánh sáng',
    unit: 'lux',
    icon: 'lightbulb',
    color: '#ffa94d',
    bg: 'rgba(255,169,77,0.08)',
  },
  {
    key: 'muc_nuoc',
    label: 'Mực nước bể',
    unit: '%',
    icon: 'waves',
    color: '#ffd43b',
    bg: 'rgba(255,212,59,0.08)',
    isWaterLevel: true,
  },
];

function SensorCard({ sensorData, connected, maxWaterDistance = 20, tankFullDistance = 2 }) {
  return (
    <div className="sensor-cards">
      {SENSOR_CONFIG.map((sensor) => {
        const raw =
          sensorData && sensorData[sensor.key] !== undefined
            ? sensorData[sensor.key]
            : null;
        const value = sensor.isWaterLevel
          ? (raw !== null ? formatWaterPercent(raw, maxWaterDistance, tankFullDistance).replace('%', '') : null)
          : raw;
        const unit = sensor.isWaterLevel && raw !== null ? '%' : sensor.unit;

        return (
          <div
            key={sensor.key}
            className="sensor-card"
            style={{ borderTop: `3px solid ${sensor.color}`, background: sensor.bg }}
          >
            <span className="sensor-icon">
              <AppIcon name={sensor.icon} size={22} color={sensor.color} />
            </span>
            <div className="sensor-label">{sensor.label}</div>
            <div className="sensor-value" style={{ color: sensor.color }}>
              {value !== null ? `${value}` : '--'}
              <span className="sensor-unit">{value !== null ? unit : ''}</span>
            </div>
            <div className={`sensor-status ${connected ? 'live' : 'offline'}`}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SensorCard;
