import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getChartData, SENSOR_KEYS } from '../utils/sensorHistory';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-time">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color, fontSize: '0.8rem' }}>
            {entry.dataKey}: <strong>{entry.value ?? '--'}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function SensorChart({ history }) {
  const [activeSensors, setActiveSensors] = useState(
    Object.fromEntries(SENSOR_KEYS.map((s) => [s.key, true]))
  );

  const chartData = getChartData(history);

  const toggleSensor = (key) => {
    setActiveSensors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {SENSOR_KEYS.map((s) => (
          <button
            key={s.key}
            className={`toggle-btn ${activeSensors[s.key] ? 'active' : 'inactive'}`}
            style={activeSensors[s.key] ? { borderColor: s.color, color: s.color } : {}}
            onClick={() => toggleSensor(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {chartData.length === 0 ? (
        <div className="chart-empty">
          <p>Đang chờ dữ liệu từ thiết bị...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              interval="preserveStartEnd"
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', color: '#6b7280' }} />
            {SENSOR_KEYS.map((s) =>
              activeSensors[s.key] ? (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.label}
                  stroke={s.color}
                  dot={false}
                  strokeWidth={1.8}
                  isAnimationActive={false}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default SensorChart;
