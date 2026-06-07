import { useMemo } from 'react';
import { waterDistanceToPercent } from '../../utils/waterLevel';

function extractTime(timeStr) {
  if (!timeStr) return '—';
  const parts = String(timeStr).trim().split(/\s+/);
  const last = parts[parts.length - 1];
  if (/^\d{1,2}:\d{2}/.test(last)) return last.slice(0, 5);
  return timeStr;
}

function buildFromHistory(history, thresholds, maxWaterDistance, tankFullDistance = 2) {
  const events = [];
  const { minSoil = 35, maxTemp = 35, minAirHum = 50 } = thresholds;

  [...history].reverse().forEach((row) => {
    const time = extractTime(row.time);
    if (row.do_am_dat != null && row.do_am_dat < minSoil) {
      events.push({
        id: `soil-${row.time}`,
        time,
        message: 'Độ ẩm đất thấp',
        detail: `${row.do_am_dat}%`,
      });
    } else if (row.do_am_dat != null && row.do_am_dat >= minSoil + 5) {
      events.push({
        id: `soil-ok-${row.time}`,
        time,
        message: 'Độ ẩm đất trở lại bình thường',
        detail: `${row.do_am_dat}%`,
      });
    }
    if (row.nhiet_do != null && row.nhiet_do > maxTemp) {
      events.push({
        id: `temp-${row.time}`,
        time,
        message: 'Nhiệt độ cao',
        detail: `${row.nhiet_do}°C`,
      });
    }
    if (row.do_am_khong_khi != null && row.do_am_khong_khi < minAirHum) {
      events.push({
        id: `air-${row.time}`,
        time,
        message: 'Không khí khô',
        detail: `${row.do_am_khong_khi}%`,
      });
    }
    if (row.muc_nuoc != null) {
      const pct = waterDistanceToPercent(row.muc_nuoc, maxWaterDistance, tankFullDistance);
      if (pct != null && pct <= 30) {
        events.push({
          id: `water-${row.time}`,
          time,
          message: 'Mực nước thấp',
          detail: `${pct}%`,
        });
      }
    }
  });

  return events;
}

function buildFromAlerts(alerts) {
  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return alerts.map((a) => ({
    id: `alert-${a.id}`,
    time: now,
    message: a.title,
    detail: a.short,
  }));
}

export function useAlertTimeline({
  history,
  alerts,
  pumpStatus,
  pumpStatusLabel,
  thresholds = {},
  maxWaterDistance = 20,
  tankFullDistance = 2,
}) {
  return useMemo(() => {
    const fromAlerts = buildFromAlerts(alerts || []);
    const fromHistory = buildFromHistory(history || [], thresholds, maxWaterDistance, tankFullDistance);

    const pumpEvents = [];
    if (pumpStatus === 'DANG_TUOI') {
      pumpEvents.push({
        id: 'pump-on',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        message: 'Bơm nước được kích hoạt',
        detail: pumpStatusLabel || 'Đang tưới',
      });
    }

    const merged = [...fromAlerts, ...pumpEvents, ...fromHistory];
    const seen = new Set();
    const unique = merged.filter((e) => {
      const key = `${e.time}-${e.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique.slice(0, 20);
  }, [history, alerts, pumpStatus, pumpStatusLabel, thresholds, maxWaterDistance, tankFullDistance]);
}

export default function AlertTimeline({ events }) {
  return (
    <section className="gd-timeline">
      <h3 className="gd-timeline-title">Lịch sử cảnh báo</h3>
      {events.length === 0 ? (
        <p className="gd-timeline-empty">Không có cảnh báo gần đây — vườn đang ổn định.</p>
      ) : (
        <ul className="gd-timeline-list">
          {events.map((ev) => (
            <li key={ev.id} className="gd-timeline-item">
              <time className="gd-timeline-time">{ev.time}</time>
              <p className="gd-timeline-msg">
                <strong>{ev.message}</strong>
                {ev.detail ? ` · ${ev.detail}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
