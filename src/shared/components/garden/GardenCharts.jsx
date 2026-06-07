import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { waterDistanceToPercent } from '../../utils/waterLevel';

const COLORS = {
  primary: '#38bdf8',
  temp: '#f97316',
  soil: '#22c55e',
  air: '#38bdf8',
  lightStart: '#fde047',
  lightEnd: '#f97316',
  water: '#38bdf8',
  grid: '#e8f0eb',
  text: '#8ab49a',
};

function ChartShell({ title, subtitle, stats, loading, empty, children }) {
  return (
    <div className="gd-chart-card">
      <div className="gd-chart-head">
        <div>
          <h3 className="gd-chart-title">{title}</h3>
          {subtitle && <p className="gd-chart-sub">{subtitle}</p>}
        </div>
        {stats && <div className="gd-chart-stats">{stats}</div>}
      </div>
      <div className="gd-chart-body">
        {loading ? (
          <div className="gd-chart-loading"><div className="gd-spinner" /></div>
        ) : empty ? (
          <div className="gd-chart-empty">Chưa có dữ liệu hôm nay</div>
        ) : children}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, unit = '', formatter }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const display = formatter ? formatter(val) : (val != null ? `${val}${unit}` : '—');
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #d4e8dc',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(22, 101, 52, 0.12)',
    }}>
      <div style={{ color: '#8ab49a', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#1a3028', fontWeight: 700, fontSize: 15 }}>{display}</div>
    </div>
  );
}

function seriesMinMax(data, key) {
  const vals = data.map((d) => d[key]).filter((v) => v != null && !Number.isNaN(v));
  if (!vals.length) return { min: null, max: null };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function hasAnyData(data, keys) {
  return data.some((row) => keys.some((k) => row[k] != null));
}

export default function GardenCharts({ chartData, loading, maxWaterDistance, tankFullDistance }) {
  const tempStats = useMemo(() => seriesMinMax(chartData, 'nhiet_do'), [chartData]);
  const soilStats = useMemo(() => seriesMinMax(chartData, 'do_am_dat'), [chartData]);
  const waterStats = useMemo(() => seriesMinMax(chartData, 'muc_nuoc'), [chartData]);

  const tempEmpty = !hasAnyData(chartData, ['nhiet_do']);
  const soilEmpty = !hasAnyData(chartData, ['do_am_dat']);
  const airEmpty = !hasAnyData(chartData, ['do_am_khong_khi']);
  const lightEmpty = !hasAnyData(chartData, ['anh_sang']);
  const waterEmpty = !hasAnyData(chartData, ['muc_nuoc']);

  const waterChartData = useMemo(
    () => chartData.map((row) => ({
      ...row,
      muc_nuoc_pct: row.muc_nuoc != null
        ? waterDistanceToPercent(row.muc_nuoc, maxWaterDistance, tankFullDistance)
        : null,
    })),
    [chartData, maxWaterDistance, tankFullDistance],
  );

  const waterPctStats = useMemo(() => {
    if (waterStats.min == null || waterStats.max == null) return { min: null, max: null };
    return {
      min: waterDistanceToPercent(waterStats.max, maxWaterDistance, tankFullDistance),
      max: waterDistanceToPercent(waterStats.min, maxWaterDistance, tankFullDistance),
    };
  }, [waterStats, maxWaterDistance, tankFullDistance]);

  return (
    <div className="gd-charts">
      {/* Temperature */}
      <ChartShell
        title="Nhiệt độ"
        subtitle="Lịch sử hôm nay"
        loading={loading}
        empty={tempEmpty}
        stats={(
          <>
            <span>Cao: <strong>{tempStats.max ?? '—'}°C</strong></span>
            <span>Thấp: <strong>{tempStats.min ?? '—'}°C</strong></span>
          </>
        )}
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.temp} stopOpacity={0.45} />
                <stop offset="100%" stopColor={COLORS.temp} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="time" tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} unit="°" />
            <Tooltip content={<ChartTooltip unit="°C" />} />
            <Area
              type="monotone"
              dataKey="nhiet_do"
              stroke={COLORS.temp}
              strokeWidth={2.5}
              fill="url(#tempGrad)"
              connectNulls
              animationDuration={800}
              dot={false}
              activeDot={{ r: 5, fill: COLORS.temp }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartShell>

      {/* Soil moisture */}
      <ChartShell
        title="Độ ẩm đất"
        subtitle="Biểu đồ quan trọng nhất"
        loading={loading}
        empty={soilEmpty}
        stats={(
          <>
            <span>TB: <strong>{soilStats.max != null && soilStats.min != null ? Math.round((soilStats.max + soilStats.min) / 2) : '—'}%</strong></span>
          </>
        )}
      >
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.soil} stopOpacity={0.4} />
                <stop offset="100%" stopColor={COLORS.soil} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <ReferenceArea y1={0} y2={30} fill="#ef4444" fillOpacity={0.08} />
            <ReferenceArea y1={30} y2={50} fill="#f59e0b" fillOpacity={0.08} />
            <ReferenceArea y1={50} y2={70} fill="#22c55e" fillOpacity={0.1} />
            <ReferenceArea y1={70} y2={100} fill="#38bdf8" fillOpacity={0.08} />
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="time" tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<ChartTooltip unit="%" />} />
            <Area
              type="monotone"
              dataKey="do_am_dat"
              stroke={COLORS.soil}
              strokeWidth={2.5}
              fill="url(#soilGrad)"
              connectNulls
              animationDuration={800}
              dot={false}
              activeDot={{ r: 5, fill: COLORS.soil }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartShell>

      {/* Air humidity */}
      <ChartShell
        title="Độ ẩm không khí"
        subtitle="Diễn biến theo giờ"
        loading={loading}
        empty={airEmpty}
      >
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="time" tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip content={<ChartTooltip unit="%" />} />
            <Line
              type="monotone"
              dataKey="do_am_khong_khi"
              stroke={COLORS.air}
              strokeWidth={2.5}
              connectNulls
              animationDuration={800}
              dot={false}
              activeDot={{ r: 5, fill: COLORS.air }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      {/* Light */}
      <ChartShell
        title="Cường độ ánh sáng"
        subtitle="Theo giờ (lux)"
        loading={loading}
        empty={lightEmpty}
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="lightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.lightStart} />
                <stop offset="100%" stopColor={COLORS.lightEnd} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="time" tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              content={(
                <ChartTooltip
                  formatter={(v) => (v != null ? `${Number(v).toLocaleString('vi-VN')} lux` : '—')}
                />
              )}
            />
            <Bar
              dataKey="anh_sang"
              fill="url(#lightGrad)"
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartShell>

      {/* Water level — full width */}
      <div className="gd-chart-card wide">
        <div className="gd-chart-head">
          <div>
            <h3 className="gd-chart-title">Mực nước bể (%)</h3>
            <p className="gd-chart-sub">Quy đổi từ muc_nuoc Arduino theo hiệu chuẩn bể</p>
          </div>
          <div className="gd-chart-stats">
            <span>Thấp nhất: <strong>{waterPctStats.min ?? '—'}%</strong></span>
            <span>Cảnh báo dưới: <strong>25%</strong></span>
          </div>
        </div>
        <div className="gd-chart-body">
          {loading ? (
            <div className="gd-chart-loading"><div className="gd-spinner" /></div>
          ) : waterEmpty ? (
            <div className="gd-chart-empty">Chưa có dữ liệu hôm nay</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={waterChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <ReferenceArea y1={0} y2={25} fill="#ef4444" fillOpacity={0.08} />
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                <XAxis dataKey="time" tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: COLORS.text, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<ChartTooltip unit="%" />} />
                <Line
                  type="monotone"
                  dataKey="muc_nuoc_pct"
                  stroke={COLORS.water}
                  strokeWidth={2.5}
                  connectNulls
                  animationDuration={800}
                  dot={false}
                  activeDot={{ r: 5, fill: COLORS.water }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
