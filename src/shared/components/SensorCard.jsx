import React from 'react';

const SENSOR_CONFIG = [
  {
    key: 'nhiet_do',
    label: 'Nhiệt độ',
    unit: '°C',
    icon: '🌡️',
    color: '#ff6b6b',
    bg: 'rgba(255,107,107,0.08)',
  },
  {
    key: 'do_am_khong_khi',
    label: 'Độ ẩm KK',
    unit: '%',
    icon: '💧',
    color: '#4dabf7',
    bg: 'rgba(77,171,247,0.08)',
  },
  {
    key: 'do_am_dat',
    label: 'Độ ẩm đất',
    unit: '%',
    icon: '🌱',
    color: '#51cf66',
    bg: 'rgba(81,207,102,0.08)',
  },
  {
    key: 'anh_sang',
    label: 'Ánh sáng',
    unit: 'lux',
    icon: '💡',
    color: '#ffa94d',
    bg: 'rgba(255,169,77,0.08)',
  },
  {
    key: 'muc_nuoc',
    label: 'Mực nước',
    unit: 'cm',
    icon: '🌊',
    color: '#ffd43b',
    bg: 'rgba(255,212,59,0.08)',
  },
];

function SensorCard({ sensorData, connected }) {
  return (
    <div className="sensor-cards">
      {SENSOR_CONFIG.map((sensor) => {
        const value =
          sensorData && sensorData[sensor.key] !== undefined
            ? sensorData[sensor.key]
            : null;

        return (
          <div
            key={sensor.key}
            className="sensor-card"
            style={{ borderTop: `3px solid ${sensor.color}`, background: sensor.bg }}
          >
            <span className="sensor-icon">{sensor.icon}</span>
            <div className="sensor-label">{sensor.label}</div>
            <div className="sensor-value" style={{ color: sensor.color }}>
              {value !== null ? `${value}` : '--'}
              <span className="sensor-unit">{value !== null ? sensor.unit : ''}</span>
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
