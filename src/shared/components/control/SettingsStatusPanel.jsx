import React from 'react';
import { IconText } from '../AppIcon';
import { PumpUnitIllustration } from './ControlSceneIllustrations';

function WaterLevelGauge({ waterPct, waterDistance, statusLabel, statusIcon, statusColor }) {
  const fillY = 120 - (waterPct / 100) * 88;
  return (
    <div className="settings-stat-card settings-stat-card--water">
      <div className="settings-stat-visual">
        <svg viewBox="0 0 100 130" className="settings-stat-svg" aria-hidden>
          <defs>
            <linearGradient id="statTankWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <clipPath id="statTankClip">
              <rect x="14" y="28" width="72" height="88" rx="8" />
            </clipPath>
          </defs>
          <rect x="10" y="24" width="80" height="96" rx="12" fill="#eff6ff" stroke="#93c5fd" strokeWidth="2" />
          <rect x="14" y={fillY} width="72" height="92" fill="url(#statTankWater)" clipPath="url(#statTankClip)" />
          {[40, 56, 72, 88, 104].map((y) => (
            <line key={y} x1="18" y1={y} x2="82" y2={y} stroke="#bfdbfe" strokeWidth="0.6" opacity="0.5" />
          ))}
        </svg>
      </div>
      <div className="settings-stat-body">
        <span className="settings-stat-label">Mức nước</span>
        <span className="settings-stat-value">{waterDistance !== null ? `${waterPct}%` : '--'}</span>
        <span className="settings-stat-sub">
          {waterDistance !== null ? `${waterDistance} cm` : 'Chưa có dữ liệu'}
        </span>
        {statusLabel && (
          <span className="settings-stat-badge" style={{ color: statusColor }}>
            <IconText icon={statusIcon} iconSize={13}>{statusLabel}</IconText>
          </span>
        )}
      </div>
    </div>
  );
}

function PumpStatusCard({ isOn, label }) {
  return (
    <div className={`settings-stat-card settings-stat-card--pump ${isOn ? 'is-on' : ''}`}>
      <div className="settings-stat-visual">
        <svg viewBox="0 0 100 100" className="settings-stat-svg" aria-hidden>
          <PumpUnitIllustration active={isOn} x={50} y={48} scale={0.72} uid="stat" showLabel={false} />
        </svg>
      </div>
      <div className="settings-stat-body">
        <span className="settings-stat-label">Máy bơm</span>
        <span className={`settings-stat-value ${isOn ? 'on' : 'off'}`}>
          {isOn ? 'Đang chạy' : 'Đang tắt'}
        </span>
        <span className="settings-stat-sub">{label || '---'}</span>
      </div>
    </div>
  );
}

function ModeStatusCard({ isAuto, label }) {
  return (
    <div className={`settings-stat-card settings-stat-card--mode ${isAuto ? 'is-auto' : ''}`}>
      <div className="settings-stat-visual settings-stat-visual--mode">
        <svg viewBox="0 0 100 100" className="settings-stat-svg" aria-hidden>
          <defs>
            <linearGradient id="modeBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={isAuto ? '#0f172a' : '#f1f5f9'} />
              <stop offset="100%" stopColor={isAuto ? '#0d2818' : '#e2e8f0'} />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="14" fill="url(#modeBg)" />
          <circle cx="50" cy="42" r="22" fill={isAuto ? 'rgba(34,197,94,0.2)' : '#e2e8f0'} stroke={isAuto ? '#22c55e' : '#94a3b8'} strokeWidth="1.5" />
          <rect x="38" y="34" width="24" height="18" rx="6" fill={isAuto ? '#22c55e' : '#94a3b8'} />
          <circle cx="44" cy="42" r="3" fill="#fff" />
          <circle cx="56" cy="42" r="3" fill="#fff" />
          <rect x="42" y="52" width="16" height="4" rx="2" fill={isAuto ? '#86efac' : '#cbd5e1'} />
          <path d="M34 68 Q50 76 66 68" stroke={isAuto ? '#4ade80' : '#94a3b8'} strokeWidth="2" fill="none" />
          {isAuto && (
            <circle cx="50" cy="42" r="28" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.4">
              <animate attributeName="r" values="24;32" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>
      </div>
      <div className="settings-stat-body">
        <span className="settings-stat-label">Chế độ tưới</span>
        <span className={`settings-stat-value ${isAuto ? 'auto' : 'manual'}`}>{label}</span>
        <span className="settings-stat-sub">{isAuto ? 'AI điều khiển' : 'Điều khiển thủ công'}</span>
      </div>
    </div>
  );
}

export default function SettingsStatusPanel({
  waterPct,
  waterDistance,
  waterStatusLabel,
  waterStatusIcon,
  waterStatusColor,
  pumpOn,
  pumpStatusLabel,
  isAuto,
  autoModeLabel,
}) {
  return (
    <div className="settings-status-panel">
      <WaterLevelGauge
        waterPct={waterPct}
        waterDistance={waterDistance}
        statusLabel={waterStatusLabel}
        statusIcon={waterStatusIcon}
        statusColor={waterStatusColor}
      />
      <PumpStatusCard isOn={pumpOn} label={pumpStatusLabel} />
      <ModeStatusCard isAuto={isAuto} label={autoModeLabel} />
    </div>
  );
}
