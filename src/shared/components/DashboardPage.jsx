import React from 'react';
import SensorChart from './SensorChart';
import EnvironmentAlertBanner from './EnvironmentAlertBanner';

/* ── Ngưỡng độ ẩm đất: minSoil = khô (cần tưới), targetSoil = dừng tưới AUTO ── */
const isSoilMoistureOk = (soilHum, minSoil) => (
  soilHum === null ? null : soilHum >= minSoil
);

const soilMoistureThresholdLabel = (minSoil) => `≥ ${minSoil}%`;

/* ── Animated overlay (particles + pulse dots on top of photo) ── */
function AnimatedOverlay() {
  return (
    <svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <style>{`
          /* Floating pollen */
          .fp1 { animation: svg-float 5.0s ease-out infinite 0.0s; }
          .fp2 { animation: svg-float 5.5s ease-out infinite 1.8s; }
          .fp3 { animation: svg-float 4.8s ease-out infinite 3.2s; }
          .fp4 { animation: svg-float 6.0s ease-out infinite 0.9s; }
          .fp5 { animation: svg-float 5.2s ease-out infinite 2.6s; }
          .fp6 { animation: svg-float 4.5s ease-out infinite 4.1s; }
          /* Water sparkle */
          .ws1 { animation: svg-sparkle 2.2s ease-in-out infinite 0.0s; }
          .ws2 { animation: svg-sparkle 2.2s ease-in-out infinite 0.8s; }
          .ws3 { animation: svg-sparkle 2.2s ease-in-out infinite 1.6s; }
          /* Pulse rings */
          .pr1 { animation: svg-pulse-ring 2.4s ease-out infinite 0.0s; }
          .pr2 { animation: svg-pulse-ring 2.4s ease-out infinite 1.2s; }

          @keyframes svg-float {
            0%   { opacity: 0;    transform: translate(0, 0) scale(1);   }
            15%  { opacity: 0.75; }
            85%  { opacity: 0.6;  }
            100% { opacity: 0;    transform: translate(12px,-50px) scale(0.6); }
          }
          @keyframes svg-sparkle {
            0%,100% { opacity: 0;   transform: scale(0.6); }
            50%     { opacity: 0.85; transform: scale(1.2); }
          }
          @keyframes svg-pulse-ring {
            0%   { r: 6;  opacity: 0.85; stroke-width: 2.5; }
            100% { r: 18; opacity: 0;    stroke-width: 1;   }
          }
        `}</style>
      </defs>

      {/* Floating pollen particles */}
      <circle className="fp1" cx="28%"  cy="65%" r="3"   fill="rgba(255,255,255,0.6)"/>
      <circle className="fp2" cx="42%"  cy="55%" r="2.5" fill="rgba(255,255,255,0.5)"/>
      <circle className="fp3" cx="58%"  cy="70%" r="3"   fill="rgba(255,255,255,0.55)"/>
      <circle className="fp4" cx="72%"  cy="60%" r="2"   fill="rgba(255,255,255,0.5)"/>
      <circle className="fp5" cx="18%"  cy="72%" r="2.5" fill="rgba(255,255,255,0.6)"/>
      <circle className="fp6" cx="85%"  cy="68%" r="2"   fill="rgba(255,255,255,0.4)"/>

      {/* Water sparkle dots */}
      <circle className="ws1" cx="22%"  cy="45%" r="4" fill="none" stroke="rgba(147,210,250,0.9)" strokeWidth="2"/>
      <circle className="ws2" cx="48%"  cy="40%" r="3" fill="none" stroke="rgba(147,210,250,0.8)" strokeWidth="1.8"/>
      <circle className="ws3" cx="35%"  cy="50%" r="3.5" fill="none" stroke="rgba(147,210,250,0.75)" strokeWidth="1.8"/>
    </svg>
  );
}

/* ── Sensor icon helpers ── */
const ICON_TEMP = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
  </svg>
);
const ICON_HUMID = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
  </svg>
);
const ICON_SOIL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4.4 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
  </svg>
);
const ICON_LIGHT = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

/* ── Banner annotation nodes (card + connector line + dot) ── */
function BannerAnnotations({ temp, airHum, soilHum, light, thresholds = {} }) {
  const statusColor = (ok) => ok === null ? '#9ca3af' : ok ? '#16a34a' : '#ef4444';

  const InfoCard = ({ item }) => (
    <div style={{
      background: 'rgba(255,255,255,0.90)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: 11,
      padding: '9px 13px',
      border: `1px solid ${item.color}33`,
      minWidth: 110, maxWidth: 140, width: '90%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: item.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ color: item.color, display: 'flex', width: 14, height: 14 }}>{item.icon}</span>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 500, lineHeight: 1.2 }}>{item.label}</span>
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: statusColor(item.ok), letterSpacing: '-0.02em', lineHeight: 1 }}>
        {item.value !== null ? `${item.value}${item.unit}` : '--'}
      </div>
      <div style={{ fontSize: '0.67rem', color: '#9ca3af', marginTop: 3 }}>Lý tưởng: {item.ideal}</div>
    </div>
  );

  const Line = ({ color, flip }) => (
    <div style={{
      flex: 1, width: 1.5, minHeight: 36,
      background: flip
        ? `linear-gradient(to top, ${color}99, ${color}33)`
        : `linear-gradient(to bottom, ${color}99, ${color}33)`,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: '35%', left: -3, width: 7, height: 1.5, background: `${color}55` }}/>
      <div style={{ position: 'absolute', top: '65%', left: -3, width: 7, height: 1.5, background: `${color}33` }}/>
    </div>
  );

  const Dot = ({ color, delay }) => (
    <div style={{ position: 'relative', width: 10, height: 10, margin: '6px 0' }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 18, height: 18, borderRadius: '50%',
        border: `2px solid ${color}`, opacity: 0,
        animation: `banner-pulse 2s ease-out infinite ${delay}s`,
      }}/>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid rgba(255,255,255,0.8)' }}/>
    </div>
  );

  const topItems = [
    {
      label: 'Nhiệt độ', value: temp, unit: '°C',
      ideal: `≤${thresholds.maxTemp ?? 35}°C`, color: '#ef4444',
      bg: 'rgba(254,226,226,0.92)', icon: ICON_TEMP,
      ok: temp === null ? null : temp <= (thresholds.maxTemp ?? 35),
      pt: 0,
    },
    {
      label: 'Độ ẩm KK', value: airHum, unit: '%',
      ideal: `≥${thresholds.minAirHum ?? 50}%`, color: '#3b82f6',
      bg: 'rgba(239,246,255,0.92)', icon: ICON_HUMID,
      ok: airHum === null ? null : airHum >= (thresholds.minAirHum ?? 50),
      pt: 28,
    },
    {
      label: 'Ánh sáng', value: light, unit: ' lux',
      ideal: `≤${((thresholds.maxLux ?? 20000) / 1000).toFixed(0)}k lux`, color: '#eab308',
      bg: 'rgba(254,252,232,0.92)', icon: ICON_LIGHT,
      ok: light === null ? null : light <= (thresholds.maxLux ?? 20000),
      pt: 12,
    },
  ];

  const bottomItems = [
    {
      label: 'Độ ẩm đất', value: soilHum, unit: '%',
      ideal: soilMoistureThresholdLabel(thresholds.minSoil ?? 35), color: '#22c55e',
      bg: 'rgba(240,253,244,0.92)', icon: ICON_SOIL,
      ok: isSoilMoistureOk(soilHum, thresholds.minSoil ?? 35),
    },
  ];

  const checks = [
    {
      label: 'Nhiệt độ',
      current: temp, unit: '°C',
      threshold: `≤ ${thresholds.maxTemp ?? 35}°C`,
      ok: temp === null ? null : temp <= (thresholds.maxTemp ?? 35),
    },
    {
      label: 'Độ ẩm đất',
      current: soilHum, unit: '%',
      threshold: soilMoistureThresholdLabel(thresholds.minSoil ?? 35),
      ok: isSoilMoistureOk(soilHum, thresholds.minSoil ?? 35),
    },
    {
      label: 'Độ ẩm KK',
      current: airHum, unit: '%',
      threshold: `≥ ${thresholds.minAirHum ?? 50}%`,
      ok: airHum === null ? null : airHum >= (thresholds.minAirHum ?? 50),
    },
  ];
  const failCount = checks.filter(c => c.ok === false).length;
  const warnColor  = failCount === 0 ? '#16a34a' : failCount === 1 ? '#d97706' : '#dc2626';
  const warnBg     = failCount === 0 ? 'rgba(220,252,231,0.92)' : failCount === 1 ? 'rgba(255,247,237,0.92)' : 'rgba(254,226,226,0.92)';
  const warnBorder = failCount === 0 ? '#86efac' : failCount === 1 ? '#fcd34d' : '#fca5a5';
  const warnLabel  = failCount === 0
    ? '✓ Cây đang phát triển tốt'
    : failCount === 1 ? '⚠ Cần theo dõi thêm'
    : '✗ Cần can thiệp';

  return (
    <>
      {/* TOP: card → line ↓ → dot */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '52%',
        zIndex: 8,
        display: 'flex', alignItems: 'flex-start',
        padding: '16px 28px 0',
        pointerEvents: 'none',
      }}>
        {topItems.map((item, idx) => (
          <div key={item.label} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: item.pt, pointerEvents: 'auto',
          }}>
            <InfoCard item={item} />
            <Line color={item.color} flip={false} />
            <Dot color={item.color} delay={idx * 0.4} />
          </div>
        ))}
      </div>

      {/* BOTTOM-LEFT: dot → line ↓ → card */}
      <div style={{
        position: 'absolute', bottom: 16, left: 0,
        height: 200, width: 220,
        zIndex: 8,
        display: 'flex', alignItems: 'stretch',
        padding: '0 28px',
        pointerEvents: 'none',
      }}>
        {bottomItems.map((item, idx) => (
          <div key={item.label} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            pointerEvents: 'auto',
          }}>
            <Dot color={item.color} delay={(idx + 3) * 0.4} />
            <Line color={item.color} flip={true} />
            <InfoCard item={item} />
          </div>
        ))}
      </div>

      {/* BOTTOM-RIGHT: dot → line → card (ngang) */}
      <div style={{
        position: 'absolute', bottom: 36, right: 20,
        zIndex: 8,
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        pointerEvents: 'none',
        gap: 0,
      }}>
        <div style={{ position: 'relative', width: 10, height: 10, margin: '0 6px', flexShrink: 0 }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 18, height: 18, borderRadius: '50%',
            border: `2px solid ${warnColor}`, opacity: 0,
            animation: 'banner-pulse 2s ease-out infinite 1.6s',
          }}/>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: warnColor, border: '2px solid rgba(255,255,255,0.8)' }}/>
        </div>

        <div style={{
          width: 60, height: 1.5, flexShrink: 0,
          background: `linear-gradient(to right, ${warnColor}33, ${warnColor}bb)`,
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: -3, left: '33%', width: 1.5, height: 7, background: `${warnColor}55` }}/>
          <div style={{ position: 'absolute', top: -3, left: '66%', width: 1.5, height: 7, background: `${warnColor}33` }}/>
        </div>

        <div style={{
          background: warnBg,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 13,
          padding: '13px 16px',
          border: `1px solid ${warnBorder}`,
          width: 260,
          pointerEvents: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'rgba(255,255,255,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontSize: '1rem',
            }}>🌿</div>
            <span style={{ fontSize: '0.78rem', color: '#1f2937', fontWeight: 700 }}>
              Tiêu chuẩn cây trồng
            </span>
          </div>
          {checks.map(c => (
            <div key={c.label} style={{
              display: 'flex', alignItems: 'center',
              marginBottom: 7, gap: 8,
            }}>
              <span style={{ fontSize: '0.72rem', color: '#6b7280', flex: 1, minWidth: 0 }}>
                {c.label}
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'flex-end',
                gap: 4,
                flexWrap: 'wrap',
                minWidth: 88,
              }}>
                <span style={{
                  fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.2,
                  color: c.ok === null ? '#9ca3af' : c.ok ? '#16a34a' : '#dc2626',
                }}>
                  {c.current !== null ? `${c.current}${c.unit}` : '--'}
                </span>
                {c.current !== null && (
                  <>
                    <span style={{ fontSize: '0.62rem', color: '#d1d5db', lineHeight: 1.2 }}>/</span>
                    <span style={{ fontSize: '0.65rem', color: '#9ca3af', lineHeight: 1.2, fontWeight: 600 }}>
                      {c.threshold}
                    </span>
                  </>
                )}
              </div>
              <span style={{
                fontSize: '0.65rem',
                color: c.ok === null ? '#9ca3af' : c.ok ? '#16a34a' : '#dc2626',
                background: c.ok === null ? '#f3f4f6' : c.ok ? '#dcfce7' : '#fee2e2',
                borderRadius: 5, padding: '2px 7px', fontWeight: 800,
                flexShrink: 0,
              }}>
                {c.ok === null ? '–' : c.ok ? '✓' : '✗'}
              </span>
            </div>
          ))}
          <div style={{
            marginTop: 8, paddingTop: 8,
            borderTop: `1px solid ${warnBorder}`,
            fontSize: '0.73rem', fontWeight: 700, color: warnColor,
          }}>
            {warnLabel}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main component ── */
function DashboardPage({
  alerts,
  configReady,
  sensorData,
  connected,
  gardenStatusLabel,
  gardenStatusClass,
  autoMode,
  pumpStatus,
  pumpStatusLabel,
  needsWatering,
  history,
  historyFilter,
  onHistoryFilterChange,
  historyDate,
  onHistoryDateChange,
  onClearHistory,
  canControl,
  thresholds = {},
}) {
  const displayedHistory = [...history].reverse().slice(0, historyFilter);

  const temp = sensorData?.nhiet_do ?? null;
  const airHum = sensorData?.do_am_khong_khi ?? null;
  const soilHum = sensorData?.do_am_dat ?? null;
  const light = sensorData?.anh_sang ?? null;
  const water = sensorData?.muc_nuoc ?? null;

  /* Pump */
  const pumpOn = pumpStatus === 'DANG_TUOI';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ── ALERTS ── */}
      {!configReady && (
        <div className="info-banner">
          <div className="info-title">Chưa cấu hình cây trồng</div>
          <div className="info-subtitle">Vui lòng chọn preset hoặc lưu cấu hình tùy chỉnh để bắt đầu phân tích.</div>
        </div>
      )}
      {alerts.length > 0 && configReady && (
        <EnvironmentAlertBanner alerts={alerts} />
      )}

      {/* ── HERO BANNER ── */}
      <div className="hero-banner">
        {/* Photo background — anchored to bottom, other elements overlap */}
        <div
          className="hero-photo"
          style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/garden-bg.png)` }}
        />

        {/* Dark gradient at top so text is readable */}
        <div className="hero-tint"/>

        {/* Animated particles overlay */}
        <AnimatedOverlay />

        {/* Annotation nodes: card + line + dot for each sensor */}
        <BannerAnnotations
          temp={temp}
          airHum={airHum}
          soilHum={soilHum}
          light={light}
          water={water}
          thresholds={thresholds}
          connected={connected}
        />

      </div>

      {/* ── SENSOR METRIC CARDS (temporarily hidden since banner shows metrics) ── */}
      {/**
      <div className="metrics-row">
        <div className="sensor-metric-card">
          <div className="metric-icon-wrap" style={{ background: '#fee2e2' }}>
            <span style={{ color: '#ef4444' }}>{ICON_TEMP}</span>
          </div>
          <div className="metric-label">Nhiệt độ môi trường</div>
          <div className="metric-value">
            {temp !== null ? `${temp}°C` : '--'}
          </div>
          <div className="metric-sub">
            <span className="metric-dot" style={{ background: temp !== null ? '#22c55e' : '#9ca3af' }}/>
            {tempSubLabel}
          </div>
        </div>

        <div className="sensor-metric-card">
          <div className="metric-icon-wrap" style={{ background: '#eff6ff' }}>
            <span style={{ color: '#3b82f6' }}>{ICON_HUMID}</span>
          </div>
          <div className="metric-label">Độ ẩm không khí</div>
          <div className="metric-value">
            {airHum !== null ? airHum : '--'}
            {airHum !== null && <span style={{ fontSize: '1rem', fontWeight: 400, color: '#6b7280', marginLeft: 2 }}>%</span>}
          </div>
          <div className="metric-sub">
            <span className="metric-dot" style={{ background: airHum !== null ? '#22c55e' : '#9ca3af' }}/>
            {airSubLabel}
          </div>
        </div>

        <div className="sensor-metric-card">
          <div className="metric-icon-wrap" style={{ background: '#f0fdf4' }}>
            <span style={{ color: '#22c55e' }}>{ICON_SOIL}</span>
          </div>
          <div className="metric-label">Độ ẩm đất</div>
          <div className="metric-value">
            {soilHum !== null ? `${soilHum}%` : '--'}
          </div>
          <div className="metric-sub">
            <span className="metric-dot" style={{
              background: soilHum === null ? '#9ca3af'
                : needsWatering ? '#eab308' : '#22c55e'
            }}/>
            {soilSubLabel}
          </div>
        </div>
      </div>
      */}

      {/* ── BOTTOM ROW ── */}
      <div className="bottom-row">
        {/* Pump status */}
        <div className={`active-devices-card pump-status-card ${pumpOn ? 'pump-on' : 'pump-off'}`}>
          <h3>Trạng thái máy bơm</h3>
          <p>
            {autoMode === 'BAT' ? 'Chế độ AUTO' : 'Chế độ thủ công'}
            {pumpStatusLabel ? ` · ${pumpStatusLabel}` : ''}
          </p>

          <div className="pump-visual-wrap">
            <div className="pump-icon-scene">
              <img
                src={`${process.env.PUBLIC_URL}/pump-icon.png`}
                alt="Máy bơm"
                className={`pump-icon-img ${pumpOn ? 'is-active' : 'is-idle'}`}
              />
              {pumpOn && (
                <div className="pump-drops" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="water-drop"
                      style={{ animationDelay: `${i * 0.22}s`, left: `${18 + i * 7}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
            <p className={`pump-status-desc ${pumpOn ? 'active' : 'idle'}`}>
              {pumpOn ? 'Máy bơm đang hoạt động' : 'Máy bơm đang tắt'}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Biểu đồ dữ liệu cảm biến</h3>
            <button className="btn-chart-detail">Mở chi tiết</button>
          </div>
          <SensorChart history={history} />
        </div>
      </div>

      {/* ── HISTORY TABLE ── */}
      <div className="history-section">
        <div className="history-header">
          <h3>Lịch sử dữ liệu</h3>
          <div className="history-controls">
            <input
              className="history-date"
              type="date"
              value={historyDate}
              onChange={(e) => onHistoryDateChange(e.target.value)}
            />
            <select
              className="history-filter"
              value={historyFilter}
              onChange={(e) => onHistoryFilterChange(Number(e.target.value))}
            >
              <option value={10}>10 bản ghi gần nhất</option>
              <option value={20}>20 bản ghi gần nhất</option>
              <option value={50}>50 bản ghi gần nhất</option>
            </select>
            <button className="btn-clear" onClick={onClearHistory}>
              Xóa lịch sử
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Thời gian</th>
                <th>Nhiệt độ (°C)</th>
                <th>Độ ẩm KK (%)</th>
                <th>Độ ẩm đất (%)</th>
                <th>Ánh sáng (lux)</th>
                <th>Mực nước (cm)</th>
              </tr>
            </thead>
            <tbody>
              {displayedHistory.length > 0 ? (
                displayedHistory.map((row, i) => (
                  <tr key={i}>
                    <td className="row-num">{history.length - i}</td>
                    <td>{row.time}</td>
                    <td style={{ color: '#ef4444', fontWeight: 500 }}>{row.nhiet_do ?? '--'}</td>
                    <td style={{ color: '#3b82f6', fontWeight: 500 }}>{row.do_am_khong_khi ?? '--'}</td>
                    <td style={{ color: '#22c55e', fontWeight: 500 }}>{row.do_am_dat ?? '--'}</td>
                    <td style={{ color: '#eab308', fontWeight: 500 }}>{row.anh_sang ?? '--'}</td>
                    <td style={{ color: '#a855f7', fontWeight: 500 }}>{row.muc_nuoc ?? '--'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="no-data">
                    Chưa có dữ liệu — thử đổi ngày hoặc kiểm tra ESP32...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {history.length > 0 && (
          <div className="history-footer">
            Tổng: <strong>{history.length}</strong> bản ghi
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
