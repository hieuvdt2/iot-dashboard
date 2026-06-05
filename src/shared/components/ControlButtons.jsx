import React, { useState, useEffect } from 'react';
import { mqttService } from '../services/mqttService';

const PENDING_LABELS = {
  auto_on:  'Đang chuyển sang chế độ AUTO...',
  auto_off: 'Đang chuyển sang chế độ thủ công...',
  bat_bom:  'Đang bật máy bơm...',
  tat_bom:  'Đang tắt máy bơm...',
};

const PENDING_TIMEOUT_MS = 10000;

function isPendingFulfilled(command, autoMode, pumpStatus) {
  if (!command) return true;
  const isAuto = autoMode === 'BAT';
  const isWatering = pumpStatus === 'DANG_TUOI';
  switch (command) {
    case 'auto_on':  return isAuto;
    case 'auto_off': return !isAuto;
    case 'bat_bom':  return isWatering;
    case 'tat_bom':  return !isWatering;
    default:         return true;
  }
}

/* ════════════════════════════════════════════════════════
   PUMP SCENE — manual mode, shows tank → pipe → pump → plant
   with animated water flow when pump is active
════════════════════════════════════════════════════════ */
function PumpScene({ isWatering }) {
  return (
    <div style={{ padding: '20px 24px 10px', background: isWatering ? '#f0fdf4' : '#f9fafb' }}>
      <svg
        viewBox="0 0 680 160"
        style={{ width: '100%', height: 'auto', maxHeight: 160, overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* paths for animateMotion */}
          <path id="p1" d="M 112 90 L 212 90" />
          <path id="p2" d="M 278 90 Q 348 90 378 56" />

          <linearGradient id="wg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="tankFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.7" />
          </linearGradient>

          <style>{`
            .gear { transform-origin: 244px 90px; }
            .gear-spin { animation: g-spin 1.5s linear infinite; }
            @keyframes g-spin { to { transform: rotate(360deg); } }
            .leaf-sway { transform-origin: 530px 106px; animation: l-sw 2.8s ease-in-out infinite; }
            @keyframes l-sw { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
            .pr  { animation: p-ring 2s ease-out infinite; }
            .pr2 { animation: p-ring 2s ease-out infinite 1s; }
            @keyframes p-ring { 0%{r:6;opacity:.9} 100%{r:18;opacity:0} }
          `}</style>
        </defs>

        {/* ── background ── */}
        <rect width="680" height="160" fill={isWatering ? '#f0fdf4' : '#f8fafc'} rx="10" />

        {/* ── TANK ── */}
        <rect x="18" y="38" width="94" height="100" rx="8"
          fill="#dbeafe" stroke={isWatering ? '#60a5fa' : '#cbd5e1'} strokeWidth="2.5" />
        {/* water fill */}
        <clipPath id="tc"><rect x="22" y="42" width="86" height="93" rx="6" /></clipPath>
        <rect x="22" y={isWatering ? '65' : '88'} width="86" height="70"
          fill="url(#tankFill)" opacity="0.75" clipPath="url(#tc)">
          {isWatering && (
            <animate attributeName="y" values="63;68;63" dur="2.5s" repeatCount="indefinite" />
          )}
        </rect>
        {/* water surface line */}
        {isWatering && (
          <line x1="24" y1="66" x2="106" y2="66" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6">
            <animate attributeName="y1" values="64;69;64" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="y2" values="64;69;64" dur="2.5s" repeatCount="indefinite" />
          </line>
        )}
        {/* tank grid lines */}
        {[50, 65, 80, 95, 110, 125].map(y => (
          <line key={y} x1="24" y1={y} x2="106" y2={y}
            stroke={isWatering ? '#bfdbfe' : '#e2e8f0'} strokeWidth="0.8" opacity="0.5" />
        ))}
        <text x="65" y="155" textAnchor="middle"
          fill={isWatering ? '#1d4ed8' : '#6b7280'} fontSize="11" fontWeight="600">Bể nước</text>

        {/* ── PIPE 1: tank → pump ── */}
        <rect x="112" y="83" width="100" height="14" rx="7"
          fill={isWatering ? '#93c5fd' : '#e2e8f0'} />
        <rect x="112" y="86" width="100" height="8" rx="4"
          fill={isWatering ? '#bfdbfe' : '#f1f5f9'} />
        {/* water beads */}
        {isWatering && [0, 0.4, 0.8].map((d, i) => (
          <circle key={i} r="5" fill="url(#wg)">
            <animateMotion dur="1.1s" begin={`${d}s`} repeatCount="indefinite">
              <mpath href="#p1" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0"
              dur="1.1s" begin={`${d}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* ── PUMP ── */}
        <circle cx="244" cy="90" r="42"
          fill="white" stroke={isWatering ? '#22c55e' : '#e2e8f0'} strokeWidth="3" />
        <circle cx="244" cy="90" r="30"
          fill={isWatering ? '#f0fdf4' : '#f8fafc'}
          stroke={isWatering ? '#86efac' : '#f1f5f9'} strokeWidth="1.5" />
        {/* spinning cross gear */}
        <g className={`gear ${isWatering ? 'gear-spin' : ''}`}>
          <line x1="222" y1="90" x2="266" y2="90"
            stroke={isWatering ? '#22c55e' : '#d1d5db'} strokeWidth="5" strokeLinecap="round" />
          <line x1="244" y1="68" x2="244" y2="112"
            stroke={isWatering ? '#22c55e' : '#d1d5db'} strokeWidth="5" strokeLinecap="round" />
          <line x1="228" y1="74" x2="260" y2="106"
            stroke={isWatering ? '#86efac' : '#e5e7eb'} strokeWidth="3.5" strokeLinecap="round" />
          <line x1="260" y1="74" x2="228" y2="106"
            stroke={isWatering ? '#86efac' : '#e5e7eb'} strokeWidth="3.5" strokeLinecap="round" />
        </g>
        <circle cx="244" cy="90" r="10" fill={isWatering ? '#22c55e' : '#9ca3af'} />
        <circle cx="244" cy="90" r="5" fill="white" opacity="0.7" />
        {/* pulse rings */}
        {isWatering && (
          <>
            <circle className="pr" cx="244" cy="90" r="6"
              fill="none" stroke="#22c55e" strokeWidth="2" opacity="0" />
            <circle className="pr2" cx="244" cy="90" r="6"
              fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0" />
          </>
        )}
        <text x="244" y="146" textAnchor="middle"
          fill={isWatering ? '#16a34a' : '#6b7280'} fontSize="11" fontWeight="600">Máy bơm</text>
        <text x="244" y="158" textAnchor="middle"
          fill={isWatering ? '#22c55e' : '#9ca3af'} fontSize="9">
          {isWatering ? '● ĐANG BƠM' : '○ CHỜ'}
          {isWatering && (
            <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
          )}
        </text>

        {/* ── PIPE 2: pump → sprinkler ── */}
        <path d="M 282 90 Q 340 90 372 56"
          stroke={isWatering ? '#93c5fd' : '#e2e8f0'}
          strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M 282 90 Q 340 90 372 56"
          stroke={isWatering ? '#bfdbfe' : '#f1f5f9'}
          strokeWidth="7" fill="none" strokeLinecap="round" />
        {isWatering && [0, 0.45].map((d, i) => (
          <circle key={i} r="4" fill="url(#wg)">
            <animateMotion dur="0.85s" begin={`${d}s`} repeatCount="indefinite">
              <mpath href="#p2" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0"
              dur="0.85s" begin={`${d}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* ── SPRINKLER HEAD ── */}
        <rect x="362" y="38" width="56" height="22" rx="6"
          fill="#6ee7b7" stroke="#059669" strokeWidth="2" />
        <text x="390" y="28" textAnchor="middle"
          fill="#047857" fontSize="10" fontWeight="600">Vòi phun</text>
        {[374, 381, 388, 395, 402, 409].map(x => (
          <circle key={x} cx={x} cy="60" r="1.8" fill="#047857" />
        ))}
        {/* water spray */}
        {isWatering && [
          { x: 374, d: 0.0 }, { x: 381, d: 0.12 }, { x: 388, d: 0.25 },
          { x: 395, d: 0.08 }, { x: 402, d: 0.20 }, { x: 409, d: 0.35 },
        ].map((s, i) => (
          <line key={i} x1={s.x} y1="62" x2={s.x - 5} y2="96"
            stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" opacity="0">
            <animate attributeName="opacity" values="0;0.85;0"
              dur="1s" begin={`${s.d}s`} repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate"
              values="0,0; 2,22" dur="1s" begin={`${s.d}s`} repeatCount="indefinite" additive="sum" />
          </line>
        ))}

        {/* ── PLANT ── */}
        {/* pot */}
        <rect x="492" y="108" width="54" height="38" rx="6"
          fill={isWatering ? '#86efac' : '#d1fae5'} stroke="#22c55e" strokeWidth="1.5" />
        <rect x="487" y="104" width="64" height="9" rx="4"
          fill={isWatering ? '#4ade80' : '#a7f3d0'} />
        {/* soil */}
        <ellipse cx="519" cy="108" rx="26" ry="5" fill="#92400e" opacity="0.5" />
        {/* stem + leaves */}
        <g className="leaf-sway">
          <line x1="519" y1="108" x2="519" y2="60"
            stroke="#166534" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="504" cy="82" rx="17" ry="9"
            fill="#4ade80" transform="rotate(-35 504 82)" />
          <ellipse cx="534" cy="72" rx="17" ry="9"
            fill="#22c55e" transform="rotate(35 534 72)" />
          <ellipse cx="519" cy="57" rx="14" ry="20" fill="#4ade80" />
          <ellipse cx="519" cy="50" rx="10" ry="13" fill="#86efac" />
        </g>
        {/* splash drops at soil */}
        {isWatering && [
          { x: 504, d: 0.55 }, { x: 519, d: 0.70 }, { x: 534, d: 0.45 },
        ].map((s, i) => (
          <circle key={i} cx={s.x} cy="105" r="3.5" fill="#93c5fd" opacity="0">
            <animate attributeName="cy" from="100" to="114" dur="0.9s"
              begin={`${s.d}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.85;0" dur="0.9s"
              begin={`${s.d}s`} repeatCount="indefinite" />
          </circle>
        ))}
        <text x="519" y="157" textAnchor="middle"
          fill="#166534" fontSize="11" fontWeight="600">Cây trồng</text>

        {/* ── labels ── */}
        {isWatering && (
          <text x="163" y="74" textAnchor="middle"
            fill="#3b82f6" fontSize="9" fontWeight="500">
            nước chảy →
            <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
          </text>
        )}

        {/* ── idle hint ── */}
        {!isWatering && (
          <text x="340" y="130" textAnchor="middle"
            fill="#9ca3af" fontSize="11">
            Nhấn "Bật bơm" để bắt đầu tưới...
          </text>
        )}
      </svg>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   AUTO SCENE — robot AI watering the plant
════════════════════════════════════════════════════════ */
function AutoScene({ isWatering }) {
  return (
    <div className="auto-scene-main">
      {/* Background grid */}
      <svg className="auto-scene-grid" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#22c55e" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div className="auto-scene-scanline" />

      {/* ── ROBOT ── */}
      <div className="auto-scene-robot-wrap">
        <img
          src={`${process.env.PUBLIC_URL}/robot-garden.png`}
          alt="AI Robot"
          className="auto-scene-robot-img"
        />
        <div className="auto-scene-robot-glow" />
      </div>

      {/* ── CENTER CONNECTION ── */}
      <div className="auto-scene-center">
        {/* Status badge */}
        <div style={{
          background: 'rgba(34,197,94,0.15)',
          border: '1px solid rgba(34,197,94,0.4)',
          borderRadius: 999,
          padding: '4px 14px',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#4ade80',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          🤖 AI đang điều khiển
        </div>

        {/* Animated flow arrows */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 0.2, 0.4].map(d => (
            <div key={d} style={{
              width: 22, height: 3, borderRadius: 2,
              background: isWatering ? '#60a5fa' : '#334155',
              animation: isWatering ? `flow-arrow 1.2s ease-in-out infinite ${d}s` : 'none',
            }} />
          ))}
          <div style={{
            width: 0, height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderLeft: `8px solid ${isWatering ? '#60a5fa' : '#334155'}`,
            animation: isWatering ? 'flow-arrow 1.2s ease-in-out infinite 0.6s' : 'none',
          }} />
        </div>

        {/* Watering status */}
        <div style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: isWatering ? '#93c5fd' : '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          {isWatering ? (
            <>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
                display: 'inline-block',
                animation: 'blink-dot 1s infinite',
              }} />
              Đang tưới nước...
            </>
          ) : '⏸ Chờ điều kiện tưới'}
        </div>

        {/* Sensor reading mini */}
        <div style={{
          fontSize: '0.68rem', color: '#475569',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 6, padding: '4px 10px',
          border: '1px solid rgba(255,255,255,0.08)',
          whiteSpace: 'nowrap',
        }}>
          AI phân tích cảm biến realtime
        </div>
      </div>

      {/* ── PLANT (watered by robot) ── */}
      <div className="auto-scene-plant">
        <svg width="130" height="190" viewBox="0 0 130 190"
          xmlns="http://www.w3.org/2000/svg">
          <defs>
            <style>{`
              .pl { transform-origin: 65px 120px; animation: l-sw2 2.5s ease-in-out infinite; }
              @keyframes l-sw2 { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
            `}</style>
          </defs>

          {/* Pot */}
          <rect x="28" y="128" width="74" height="48" rx="8"
            fill={isWatering ? '#14532d' : '#1a3a2a'} stroke="#22c55e" strokeWidth="1.5" />
          <rect x="22" y="122" width="86" height="11" rx="5"
            fill={isWatering ? '#166534' : '#1e3a2e'} />
          {/* Heart on pot */}
          <text x="65" y="158" textAnchor="middle" fill="#22c55e" fontSize="14" opacity="0.6">♥</text>

          {/* Soil */}
          <ellipse cx="65" cy="124" rx="34" ry="6"
            fill="#451a03" opacity="0.8" />

          {/* Plant */}
          <g className="pl">
            <line x1="65" y1="122" x2="65" y2="68"
              stroke="#166534" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="48" cy="90" rx="20" ry="11"
              fill="#4ade80" transform="rotate(-30 48 90)" />
            <ellipse cx="82" cy="78" rx="20" ry="11"
              fill="#22c55e" transform="rotate(30 82 78)" />
            <ellipse cx="65" cy="64" rx="16" ry="24" fill="#4ade80" />
            <ellipse cx="65" cy="56" rx="11" ry="16" fill="#86efac" />
          </g>

          {/* Water drops falling when watering */}
          {isWatering && [
            { x: 52, d: 0.1 }, { x: 62, d: 0.4 }, { x: 72, d: 0.25 },
            { x: 58, d: 0.6 }, { x: 68, d: 0.8 },
          ].map((w, i) => (
            <circle key={i} cx={w.x} cy="15" r="4" fill="#60a5fa" opacity="0">
              <animate attributeName="cy" from="10" to="115" dur="1.2s"
                begin={`${w.d}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.9;0.9;0" dur="1.2s"
                begin={`${w.d}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Splash at soil */}
          {isWatering && [
            { x: 52, d: 1.05 }, { x: 65, d: 1.20 }, { x: 78, d: 1.10 },
          ].map((s, i) => (
            <circle key={i} cx={s.x} cy="122" r="4" fill="#93c5fd" opacity="0">
              <animate attributeName="r" values="2;6;2" dur="0.6s"
                begin={`${s.d}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.7;0" dur="0.6s"
                begin={`${s.d}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Glow effect when watering */}
          {isWatering && (
            <ellipse cx="65" cy="65" rx="30" ry="30"
              fill="#22c55e" opacity="0">
              <animate attributeName="opacity" values="0;0.08;0" dur="2s" repeatCount="indefinite" />
              <animate attributeName="rx" values="28;40;28" dur="2s" repeatCount="indefinite" />
            </ellipse>
          )}
        </svg>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
function ControlButtons({ connected, autoMode, pumpStatus, manualSwitch, manualSwitchActive, pumpWebRequest, canControl }) {
  const [lastAction, setLastAction] = useState(null);
  const [pendingCommand, setPendingCommand] = useState(null);
  const [pendingError, setPendingError] = useState(null);

  const handleControl = (command, label) => {
    if (!connected || pendingCommand || !canControl) return;
    setPendingError(null);
    setPendingCommand(command);
    mqttService.publishControl(command);
    setLastAction({ command, label, time: new Date().toLocaleTimeString('vi-VN') });
  };

  /* Clear loading khi MQTT xac nhan trang thai moi */
  useEffect(() => {
    if (!pendingCommand) return undefined;

    if (isPendingFulfilled(pendingCommand, autoMode, pumpStatus)) {
      setPendingCommand(null);
      setPendingError(null);
      return undefined;
    }

    const timeout = setTimeout(() => {
      setPendingCommand(null);
      setPendingError('Thiết bị chưa phản hồi. Vui lòng thử lại.');
    }, PENDING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [pendingCommand, autoMode, pumpStatus]);

  const isAuto     = autoMode === 'BAT';
  const isWatering = pumpStatus === 'DANG_TUOI';

  const controlSource = (() => {
    if (isAuto) {
      if (manualSwitch) return 'Công tắc cơ đang BẬT (AUTO đang điều khiển bơm)';
      return null;
    }
    if (manualSwitchActive) return 'Đang bật bởi công tắc cơ';
    if (pumpWebRequest && isWatering) return 'Đang bật bởi web';
    if (isWatering) return 'Máy bơm đang chạy';
    if (manualSwitch && !isWatering) return 'Công tắc cơ BẬT — bơm đang tắt (chờ lệnh hoặc an toàn)';
    return null;
  })();

  const pumpCommand = isWatering ? 'tat_bom' : 'bat_bom';
  const pumpLabel   = isWatering ? 'Tắt bơm' : 'Bật bơm';
  const modeCommand = isAuto ? 'auto_off' : 'auto_on';
  const modeLabel   = isAuto ? 'Tắt AUTO' : 'Bật AUTO';

  const isBusy = Boolean(pendingCommand);
  const disabled = !connected || isBusy || !canControl;
  const showPumpButton = !isAuto && !(isBusy && pendingCommand === 'auto_on');

  const renderBtnContent = (command, icon, label) => {
    if (pendingCommand === command) {
      return (
        <>
          <span className="btn-spinner" aria-hidden="true" />
          {PENDING_LABELS[command] || 'Đang gửi...'}
        </>
      );
    }
    return <>{icon} {label}</>;
  };

  const btnStyle = ({ base, active }) => ({
    padding: '9px 18px',
    borderRadius: 9,
    border: `1.5px solid ${base}44`,
    background: active ? base + '22' : '#f9fafb',
    color: active ? base : '#6b7280',
    fontWeight: 700,
    fontSize: '0.83rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    transition: 'all 0.15s',
    letterSpacing: '-0.01em',
    minWidth: pendingCommand ? 148 : undefined,
    justifyContent: 'center',
  });

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      {/* ── HEADER BAR ── */}
      <div style={{
        padding: '14px 22px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f3f4f6',
        flexWrap: 'wrap',
        gap: 10,
        background: isBusy ? '#f8fafc' : (isAuto ? '#f0fdf4' : '#fff'),
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
            {isBusy ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                <span style={{ color: '#2563eb' }}>{PENDING_LABELS[pendingCommand]}</span>
              </>
            ) : isAuto ? (
              <><span>🤖</span> Chế độ tự động (AI)</>
            ) : isWatering ? (
              <><span style={{ color: '#3b82f6' }}>💧</span> Đang bơm thủ công</>
            ) : (
              <><span>⏸</span> Hệ thống đang chờ</>
            )}
          </div>
          {controlSource && !isBusy && (
            <div style={{ fontSize: '0.73rem', color: manualSwitchActive ? '#b45309' : '#64748b', marginTop: 2 }}>
              {manualSwitchActive ? '🔌 ' : '🌐 '}{controlSource}
            </div>
          )}
          {lastAction && !isBusy && (
            <div style={{ fontSize: '0.73rem', color: '#9ca3af', marginTop: controlSource ? 2 : 2 }}>
              Lần cuối: <strong style={{ color: '#6b7280' }}>{lastAction.label}</strong> lúc {lastAction.time}
            </div>
          )}
          {isBusy && (
            <div style={{ fontSize: '0.73rem', color: '#64748b', marginTop: 2 }}>
              Đang đợi thiết bị xác nhận qua MQTT...
            </div>
          )}
          {pendingError && !isBusy && (
            <div style={{ fontSize: '0.73rem', color: '#dc2626', marginTop: 2, fontWeight: 600 }}>
              {pendingError}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={btnStyle({ base: '#22c55e', active: isAuto })}
            onClick={() => handleControl(modeCommand, modeLabel)}
            disabled={disabled}
            aria-busy={pendingCommand === modeCommand}
          >
            {renderBtnContent(modeCommand, '🤖', modeLabel)}
          </button>

          {showPumpButton && (
            <button
              style={btnStyle({ base: '#3b82f6', active: isWatering })}
              onClick={() => handleControl(pumpCommand, pumpLabel)}
              disabled={disabled}
              aria-busy={pendingCommand === pumpCommand}
            >
              {renderBtnContent(pumpCommand, '💧', pumpLabel)}
            </button>
          )}
        </div>
      </div>

      {/* ── VISUAL SCENE ── */}
      <div className="control-scene-wrap">
        {isBusy ? (
          <div className="control-scene-loading" role="status" aria-live="polite">
            <div className="control-scene-spinner" aria-hidden="true" />
            <p className="control-scene-loading-title">{PENDING_LABELS[pendingCommand]}</p>
            <p className="control-scene-loading-sub">Đang đợi thiết bị phản hồi trạng thái mới...</p>
          </div>
        ) : isAuto ? (
          <AutoScene isWatering={isWatering} />
        ) : (
          <PumpScene isWatering={isWatering} />
        )}
      </div>

      {/* ── WARNINGS ── */}
      {(!connected || (!canControl && connected)) && (
        <div style={{
          margin: '0 18px 14px',
          padding: '8px 14px',
          borderRadius: 8,
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          fontSize: '0.78rem',
          color: '#9a3412',
        }}>
          {!connected
            ? '⚠️ Cần kết nối MQTT để điều khiển bơm'
            : '⚠️ Bạn cần quyền admin để điều khiển bơm'}
        </div>
      )}
    </div>
  );
}

export default ControlButtons;
