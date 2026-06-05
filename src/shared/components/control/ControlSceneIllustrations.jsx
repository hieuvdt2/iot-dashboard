import React from 'react';

const ROBOT_SRC = `${process.env.PUBLIC_URL}/robot-garden.png`;

/** Máy bơm centrifugal — dùng chung scene & thẻ trạng thái */
export function PumpUnitIllustration({
  active, x = 0, y = 0, scale = 1, uid = 'pump', showLabel = true, labelPosition = 'below',
}) {
  const stroke = active ? '#22c55e' : '#94a3b8';
  const motorFill = active ? '#dcfce7' : '#f1f5f9';
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="38" rx="34" ry="5" fill="#000" opacity="0.1" />

      {/* Motor */}
      <rect x="-30" y="-62" width="60" height="34" rx="8" fill={motorFill} stroke={stroke} strokeWidth="2" />
      <rect x="-22" y="-54" width="44" height="6" rx="3" fill={active ? '#86efac' : '#cbd5e1'} />
      <rect x="-22" y="-44" width="44" height="6" rx="3" fill={active ? '#bbf7d0' : '#e2e8f0'} />
      <circle cx="0" cy="-28" r="4" fill={active ? '#22c55e' : '#94a3b8'} />

      {/* Volute casing */}
      <path
        d="M-40 4 A 40 40 0 1 1 40 4 L 40 18 A 26 26 0 0 0 14 18 L 14 4 Z"
        fill="#fff"
        stroke={stroke}
        strokeWidth="2.5"
      />
      <circle r="20" fill={active ? '#f0fdf4' : '#f8fafc'} stroke={active ? '#86efac' : '#e2e8f0'} strokeWidth="2" />

      {/* Impeller */}
      <g style={{ transformOrigin: '0 0', animation: active ? 'control-gear-spin 0.9s linear infinite' : 'none' }}>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse
            key={deg}
            cx="0"
            cy="-6"
            rx="6"
            ry="14"
            fill={active ? '#22c55e' : '#94a3b8'}
            transform={`rotate(${deg})`}
            opacity="0.9"
          />
        ))}
        <circle r="6" fill="#fff" stroke={active ? '#16a34a' : '#64748b'} strokeWidth="1.5" />
      </g>

      {/* Inlet */}
      <rect x="-54" y="-6" width="18" height="14" rx="4" fill={active ? '#bfdbfe' : '#e2e8f0'} stroke={active ? '#60a5fa' : '#cbd5e1'} strokeWidth="1.5" />
      {/* Outlet */}
      <rect x="8" y="-30" width="14" height="22" rx="4" fill={active ? '#bfdbfe' : '#e2e8f0'} stroke={active ? '#60a5fa' : '#cbd5e1'} strokeWidth="1.5" transform="rotate(25 15 -19)" />

      {active && (
        <circle r="24" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0">
          <animate attributeName="r" values="22;40" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;0" dur="1.6s" repeatCount="indefinite" />
        </circle>
      )}

      {showLabel && labelPosition === 'below' && (
        <>
          <text y="58" textAnchor="middle" fill={active ? '#15803d' : '#64748b'} fontSize="11" fontWeight="700">Máy bơm</text>
          <text y="72" textAnchor="middle" fill={active ? '#22c55e' : '#94a3b8'} fontSize="9" fontWeight="600">
            {active ? 'ĐANG BƠM' : 'CHỜ'}
          </text>
        </>
      )}
      {showLabel && labelPosition === 'right' && (
        <>
          <text x="54" y="-4" fill={active ? '#15803d' : '#64748b'} fontSize="11" fontWeight="700">Máy bơm</text>
          <text x="54" y="10" fill={active ? '#22c55e' : '#94a3b8'} fontSize="9" fontWeight="600">
            {active ? 'ĐANG BƠM' : 'CHỜ'}
          </text>
        </>
      )}
    </g>
  );
}

/** Cây trồng + chậu */
export function GardenPlantIllustration({ isWatering, x = 0, y = 0, scale = 1, idSuffix = '' }) {
  const uid = idSuffix || 'default';
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <defs>
        <linearGradient id={`potGrad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isWatering ? '#4ade80' : '#bbf7d0'} />
          <stop offset="100%" stopColor={isWatering ? '#166534' : '#86efac'} />
        </linearGradient>
        <linearGradient id={`leafGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>

      <ellipse cx="65" cy="168" rx="42" ry="6" fill="#000" opacity="0.08" />
      <rect x="22" y="128" width="86" height="44" rx="10" fill={`url(#potGrad-${uid})`} stroke="#22c55e" strokeWidth="2" />
      <rect x="16" y="122" width="98" height="12" rx="6" fill={isWatering ? '#22c55e' : '#a7f3d0'} />
      <ellipse cx="65" cy="128" rx="36" ry="7" fill="#78350f" opacity="0.55" />

      <g style={{ transformOrigin: '65px 128px', animation: 'control-plant-sway 3s ease-in-out infinite' }}>
        <path d="M65 128 L65 72" stroke="#14532d" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="44" cy="98" rx="22" ry="12" fill={`url(#leafGrad-${uid})`} transform="rotate(-32 44 98)" />
        <ellipse cx="86" cy="86" rx="22" ry="12" fill="#22c55e" transform="rotate(32 86 86)" />
        <ellipse cx="65" cy="68" rx="18" ry="26" fill="#4ade80" />
        <ellipse cx="65" cy="58" rx="12" ry="18" fill="#86efac" />
      </g>

      {isWatering && [
        { cx: 48, delay: 0 }, { cx: 65, delay: 0.25 }, { cx: 78, delay: 0.5 },
      ].map((drop, i) => (
        <circle key={i} cx={drop.cx} cy="18" r="4" fill="#60a5fa" opacity="0">
          <animate attributeName="cy" values="18;118" dur="1.1s" begin={`${drop.delay}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.9;0.9;0" dur="1.1s" begin={`${drop.delay}s`} repeatCount="indefinite" />
        </circle>
      ))}

      <text x="65" y="188" textAnchor="middle" fill="#166534" fontSize="12" fontWeight="700">Cây trồng</text>
    </g>
  );
}

function ManualPumpSceneHorizontal({ active }) {
  const cy = 138;
  return (
    <svg
      viewBox="0 0 720 260"
      preserveAspectRatio="xMidYMid meet"
      className="control-manual-svg control-manual-svg--horizontal"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="skyManual" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#ecfdf5' : '#f8fafc'} />
          <stop offset="100%" stopColor={active ? '#d1fae5' : '#f1f5f9'} />
        </linearGradient>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="tankWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.85" />
        </linearGradient>
        <path id="flowPipe1" d={`M 108 ${cy} L 228 ${cy}`} />
        <path id="flowPipe2" d={`M 272 ${cy} Q 340 ${cy} 390 ${cy - 36}`} />
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect width="720" height="260" fill="url(#skyManual)" rx="12" />
      <path d="M0 210 Q180 200 360 210 T720 206 L720 260 L0 260 Z" fill={active ? '#bbf7d0' : '#e2e8f0'} opacity="0.6" />

      <g filter="url(#softShadow)">
        <rect x="18" y="72" width="96" height="128" rx="14" fill="#eff6ff" stroke={active ? '#3b82f6' : '#cbd5e1'} strokeWidth="2.5" />
        <clipPath id="tankClip"><rect x="22" y="76" width="88" height="120" rx="10" /></clipPath>
        <rect x="22" y={active ? '100' : '118'} width="88" height="96" fill="url(#tankWater)" clipPath="url(#tankClip)">
          {active && <animate attributeName="y" values="98;104;98" dur="2.4s" repeatCount="indefinite" />}
        </rect>
        <text x="66" y="218" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="700">Bể nước</text>
      </g>

      <rect x="104" y={cy - 8} width="124" height="18" rx="9" fill={active ? '#bfdbfe' : '#e2e8f0'} />
      {active && [0, 0.35, 0.7].map((d, i) => (
        <circle key={i} r="5" fill="url(#waterGrad)">
          <animateMotion dur="1s" begin={`${d}s`} repeatCount="indefinite"><mpath href="#flowPipe1" /></animateMotion>
          <animate attributeName="opacity" values="0;1;1;0" dur="1s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}

      <g filter="url(#softShadow)">
        <PumpUnitIllustration active={active} x={228} y={cy} scale={1.1} uid="manual-h" />
      </g>

      <path d={`M 272 ${cy} Q 340 ${cy} 390 ${cy - 36}`} stroke={active ? '#93c5fd' : '#e2e8f0'} strokeWidth="16" fill="none" strokeLinecap="round" />
      {active && [0, 0.4].map((d, i) => (
        <circle key={i} r="4" fill="url(#waterGrad)">
          <animateMotion dur="0.9s" begin={`${d}s`} repeatCount="indefinite"><mpath href="#flowPipe2" /></animateMotion>
          <animate attributeName="opacity" values="0;1;1;0" dur="0.9s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}

      <g transform={`translate(378, ${cy - 82})`}>
        <rect x="0" y="0" width="72" height="30" rx="9" fill="#34d399" stroke="#059669" strokeWidth="2" />
        <rect x="10" y="26" width="52" height="10" rx="4" fill="#047857" />
        {active && [12, 26, 40, 54, 68].map((x, i) => (
          <line key={x} x1={x} y1="40" x2={x - 5} y2="78" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0">
            <animate attributeName="opacity" values="0;0.9;0" dur="0.9s" begin={`${i * 0.12}s`} repeatCount="indefinite" />
          </line>
        ))}
        <text x="36" y="-8" textAnchor="middle" fill="#047857" fontSize="11" fontWeight="700">Vòi phun</text>
      </g>

      <GardenPlantIllustration isWatering={active} x={490} y={28} scale={1.15} idSuffix="manual" />

      {!active && (
        <text x="360" y="228" textAnchor="middle" fill="#94a3b8" fontSize="12">
          Nhấn &quot;Bật bơm&quot; để bắt đầu tưới
        </text>
      )}
    </svg>
  );
}

function ManualPumpSceneVertical({ active }) {
  const cx = 150;
  return (
    <svg
      viewBox="0 0 300 400"
      preserveAspectRatio="xMidYMid meet"
      className="control-manual-svg control-manual-svg--vertical"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="skyManualV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={active ? '#ecfdf5' : '#f8fafc'} />
          <stop offset="100%" stopColor={active ? '#d1fae5' : '#f1f5f9'} />
        </linearGradient>
        <linearGradient id="waterGradV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="tankWaterV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <path id="flowPipeV1" d={`M ${cx} 118 L ${cx} 188`} />
        <path id="flowPipeV2" d={`M ${cx} 268 L ${cx} 318`} />
        <filter id="softShadowV" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.12" />
        </filter>
      </defs>

      <rect width="300" height="400" fill="url(#skyManualV)" rx="12" />

      <g filter="url(#softShadowV)" transform={`translate(${cx}, 62)`}>
        <rect x="-46" y="-48" width="92" height="100" rx="12" fill="#eff6ff" stroke={active ? '#3b82f6' : '#cbd5e1'} strokeWidth="2.5" />
        <clipPath id="tankClipV"><rect x="-40" y="-42" width="80" height="88" rx="9" /></clipPath>
        <rect x="-40" y={active ? '-14' : '4'} width="80" height="88" fill="url(#tankWaterV)" clipPath="url(#tankClipV)">
          {active && <animate attributeName="y" values="-16;-10;-16" dur="2.4s" repeatCount="indefinite" />}
        </rect>
        <text y="64" textAnchor="middle" fill="#1e40af" fontSize="12" fontWeight="700">Bể nước</text>
      </g>

      <rect x={cx - 10} y="112" width="20" height="82" rx="8" fill={active ? '#bfdbfe' : '#e2e8f0'} />
      {active && [0, 0.35, 0.7].map((d, i) => (
        <circle key={i} r="5" fill="url(#waterGradV)">
          <animateMotion dur="1s" begin={`${d}s`} repeatCount="indefinite"><mpath href="#flowPipeV1" /></animateMotion>
          <animate attributeName="opacity" values="0;1;1;0" dur="1s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}

      <g filter="url(#softShadowV)">
        <PumpUnitIllustration active={active} x={cx - 8} y={218} scale={0.88} uid="manual-v" labelPosition="right" />
      </g>

      <rect x={cx - 10} y="262" width="20" height="62" rx="8" fill={active ? '#bfdbfe' : '#e2e8f0'} />
      {active && [0, 0.4].map((d, i) => (
        <circle key={i} r="4" fill="url(#waterGradV)">
          <animateMotion dur="0.9s" begin={`${d}s`} repeatCount="indefinite"><mpath href="#flowPipeV2" /></animateMotion>
          <animate attributeName="opacity" values="0;1;1;0" dur="0.9s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}

      <g transform={`translate(${cx}, 332)`}>
        <text y="-14" textAnchor="middle" fill="#047857" fontSize="11" fontWeight="700">Vòi phun</text>
        <rect x="-34" y="0" width="68" height="26" rx="9" fill="#34d399" stroke="#059669" strokeWidth="2" />
        <rect x="-26" y="22" width="52" height="8" rx="3" fill="#047857" />
        {active && [-20, -6, 8, 22].map((x, i) => (
          <line key={x} x1={x} y1="34" x2={x} y2="58" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" opacity="0">
            <animate attributeName="opacity" values="0;0.95;0" dur="0.9s" begin={`${i * 0.12}s`} repeatCount="indefinite" />
          </line>
        ))}
      </g>

      <GardenPlantIllustration isWatering={active} x={12} y={268} scale={0.58} idSuffix="manual-v" />
    </svg>
  );
}

export function ManualPumpScene({ isWatering, vertical = false }) {
  const active = isWatering;
  return (
    <div className={`control-manual-scene ${active ? 'is-active' : ''} ${vertical ? 'is-vertical' : ''}`}>
      {vertical ? <ManualPumpSceneVertical active={active} /> : <ManualPumpSceneHorizontal active={active} />}
    </div>
  );
}

function AutoPumpSceneHorizontal({ isWatering }) {
  return (
    <svg
      viewBox="0 0 720 260"
      preserveAspectRatio="xMidYMid meet"
      className="control-auto-svg control-auto-svg--horizontal"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="autoBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="55%" stopColor="#0d2818" />
          <stop offset="100%" stopColor="#071510" />
        </linearGradient>
        <radialGradient id="robotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <path id="dataFlow" d="M 200 138 L 540 138" />
      </defs>
      <rect width="720" height="260" fill="url(#autoBg)" />
      <ellipse cx="110" cy="218" rx="72" ry="12" fill="#000" opacity="0.35" />
      <circle cx="110" cy="138" r="82" fill="url(#robotGlow)" />
      <image href={ROBOT_SRC} x="34" y="54" width="152" height="152" preserveAspectRatio="xMidYMid meet" />
      <path d="M 200 138 L 540 138" stroke={isWatering ? '#3b82f6' : '#334155'} strokeWidth="3" strokeLinecap="round" opacity="0.65" />
      {isWatering && (
        <path d="M 200 138 L 540 138" stroke="#60a5fa" strokeWidth="2" strokeDasharray="10 14" opacity="0.9">
          <animate attributeName="stroke-dashoffset" from="0" to="-48" dur="0.9s" repeatCount="indefinite" />
        </path>
      )}
      {[0, 0.3, 0.6].map((d, i) => (
        <circle key={i} r="5" fill={isWatering ? '#60a5fa' : '#475569'}>
          <animateMotion dur="1.4s" begin={`${d}s`} repeatCount="indefinite"><mpath href="#dataFlow" /></animateMotion>
          <animate attributeName="opacity" values="0;1;0" dur="1.4s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <g transform="translate(490, 36)">
        <GardenPlantIllustration isWatering={isWatering} x={0} scale={1.1} idSuffix="auto" />
      </g>
    </svg>
  );
}

function AutoPumpSceneVertical({ isWatering }) {
  const cx = 150;
  return (
    <svg
      viewBox="0 0 300 360"
      preserveAspectRatio="xMidYMid meet"
      className="control-auto-svg control-auto-svg--vertical"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="autoBgV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#071510" />
        </linearGradient>
        <path id="dataFlowV" d={`M ${cx} 168 L ${cx} 268`} />
      </defs>
      <rect width="300" height="360" fill="url(#autoBgV)" rx="12" />
      <circle cx={cx} cy="88" r="62" fill="rgba(34,197,94,0.15)" />
      <image href={ROBOT_SRC} x="90" y="26" width="120" height="120" preserveAspectRatio="xMidYMid meet" />
      <rect x={cx - 10} y="160" width="20" height="116" rx="8" fill="#1e293b" />
      <rect x={cx - 6} y="164" width="12" height="108" rx="5" fill={isWatering ? '#3b82f6' : '#334155'} opacity="0.7" />
      {isWatering && (
        <rect x={cx - 6} y="164" width="12" height="108" rx="5" fill="none" stroke="#60a5fa" strokeWidth="2" strokeDasharray="8 10">
          <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="0.9s" repeatCount="indefinite" />
        </rect>
      )}
      {[0, 0.35, 0.7].map((d, i) => (
        <circle key={i} r="4" fill={isWatering ? '#60a5fa' : '#475569'}>
          <animateMotion dur="1.2s" begin={`${d}s`} repeatCount="indefinite"><mpath href="#dataFlowV" /></animateMotion>
          <animate attributeName="opacity" values="0;1;0" dur="1.2s" begin={`${d}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <g transform="translate(92, 228)">
        <GardenPlantIllustration isWatering={isWatering} x={0} scale={0.68} idSuffix="auto-v" />
      </g>
    </svg>
  );
}

export function AutoPumpScene({ isWatering, vertical = false }) {
  return (
    <div className={`control-auto-scene ${isWatering ? 'is-watering' : ''} ${vertical ? 'is-vertical' : ''}`}>
      {!vertical && (
        <>
          <svg className="control-auto-grid" aria-hidden>
            <defs>
              <pattern id="autoGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M28 0 L0 0 0 28" fill="none" stroke="#22c55e" strokeWidth="0.5" opacity="0.35" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#autoGrid)" />
          </svg>
          <div className="control-auto-scanline" aria-hidden />
        </>
      )}
      {vertical ? <AutoPumpSceneVertical isWatering={isWatering} /> : <AutoPumpSceneHorizontal isWatering={isWatering} />}
      <div className={`control-auto-status ${vertical ? 'is-inline' : ''}`}>
        <span className="control-auto-badge">AI đang điều khiển</span>
        <p className={`control-auto-state ${isWatering ? 'active' : ''}`}>
          {isWatering ? 'Đang tưới nước...' : 'Chờ điều kiện tưới'}
        </p>
        <p className="control-auto-hint">Phân tích cảm biến realtime</p>
      </div>
    </div>
  );
}
