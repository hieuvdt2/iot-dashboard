import React from 'react';
import AppIcon from '../AppIcon';

const STATUS_MAP = {
  TOT: { icon: 'sprout', label: 'Vườn ổn định', tone: 'success' },
  CAN_CHU_Y: { icon: 'alert-triangle', label: 'Cần chú ý', tone: 'warning' },
  NGUY_HIEM: { icon: 'siren', label: 'Cần tưới ngay', tone: 'danger' },
  CHUA_CAU_HINH: { icon: 'settings', label: 'Chưa cấu hình', tone: 'muted' },
};

function formatLastUpdate(sensorData, chartSync) {
  if (sensorData?.time) return sensorData.time;
  if (chartSync) {
    return chartSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  return '—';
}

export default function GardenHeader({
  gardenStatus,
  gardenStatusLabel,
  connected,
  autoMode,
  sensorData,
  chartLastSync,
}) {
  const mapped = STATUS_MAP[gardenStatus] ?? {
    icon: 'leaf',
    label: gardenStatusLabel || 'Đang cập nhật',
    tone: 'muted',
  };

  const autoOn = autoMode === 'BAT';
  const autoLabel = autoOn ? 'Tự động' : autoMode === 'TAT' ? 'Thủ công' : '—';

  return (
    <header className="gd-header">
      <div className="gd-header-top">
        <div>
          <div className="gd-header-title">Trạng thái vườn</div>
          <div className="gd-status-row">
            <span className="gd-status-icon" aria-hidden>
              <AppIcon name={mapped.icon} size={22} />
            </span>
            <span className={`gd-status-label ${mapped.tone}`}>{mapped.label}</span>
          </div>
        </div>
        <div className="gd-meta-chips">
          <span className={`gd-chip ${connected ? 'online' : 'offline'}`}>
            {connected ? 'ESP32 đang kết nối' : 'ESP32 mất kết nối'}
          </span>
          <span className={`gd-chip ${autoOn ? 'auto-on' : ''}`}>
            {autoLabel}
          </span>
        </div>
      </div>
      <p className="gd-header-sub">
        Cập nhật lúc {formatLastUpdate(sensorData, chartLastSync)}
      </p>
    </header>
  );
}
