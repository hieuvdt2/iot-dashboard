import React, { useEffect, useMemo, useState } from 'react';
import AppIcon from './AppIcon';

const DISMISS_KEY = 'iot_env_alert_sig';
const MOBILE_MEDIA = '(max-width: 768px)';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_MEDIA).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA);
    const onChange = (event) => setIsMobile(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

function buildAlertSignature(alerts) {
  return alerts.map((a) => `${a.id}:${a.severity}`).sort().join('|');
}

function EnvironmentToast({ alerts }) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);

  const signature = useMemo(() => buildAlertSignature(alerts), [alerts]);

  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem(DISMISS_KEY) === signature);
    } catch {
      setHidden(false);
    }
    setExpanded(false);
  }, [signature]);

  useEffect(() => {
    if (!expanded) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  if (!alerts.length || hidden) return null;

  const hasDanger = alerts.some((a) => a.severity === 'danger');
  const primary = alerts[0];

  const handleDismiss = (event) => {
    event.stopPropagation();
    try {
      sessionStorage.setItem(DISMISS_KEY, signature);
    } catch {
      // Ignore storage errors.
    }
    setHidden(true);
    setExpanded(false);
  };

  const toggleExpanded = () => setExpanded((value) => !value);

  return (
    <>
      {expanded && (
        <button
          type="button"
          className="env-toast-backdrop"
          onClick={() => setExpanded(false)}
          aria-label="Đóng cảnh báo"
        />
      )}

      <div
        className={`env-toast ${hasDanger ? 'is-danger' : 'is-warning'} ${expanded ? 'is-expanded' : ''} ${isMobile ? 'is-mobile' : ''}`}
        onMouseEnter={() => { if (!isMobile) setExpanded(true); }}
        onMouseLeave={() => { if (!isMobile) setExpanded(false); }}
      >
      <div
        className="env-toast-compact"
        role="button"
        tabIndex={0}
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
        aria-expanded={expanded}
        aria-label={expanded ? 'Thu gọn cảnh báo' : `Cảnh báo: ${primary.title}. Bấm để xem chi tiết`}
      >
        <div className="env-toast-icon-wrap">
          <span className="env-toast-icon">
            <AppIcon name={primary.icon || 'alert-triangle'} size={20} />
          </span>
          <span className="env-toast-pulse" aria-hidden="true" />
          {alerts.length > 1 && (
            <span className="env-toast-badge">{alerts.length}</span>
          )}
        </div>
        <div className="env-toast-compact-text">
          <span className="env-toast-label">
            {hasDanger ? 'Cảnh báo khẩn' : 'Cảnh báo môi trường'}
          </span>
          <strong className="env-toast-primary">{primary.title}</strong>
        </div>
        {alerts.length > 1 && (
          <span className="env-toast-count">+{alerts.length - 1}</span>
        )}
        <button
          type="button"
          className="env-toast-dismiss"
          onClick={handleDismiss}
          aria-label="Tắt cảnh báo (hiện lại khi có vấn đề mới)"
          title="Tắt cảnh báo"
        >
          ×
        </button>
        <span className="env-toast-chevron" aria-hidden="true">{expanded ? '▾' : '▴'}</span>
      </div>

      <button
        type="button"
        className="env-toast-chip-dismiss"
        onClick={handleDismiss}
        aria-label="Tắt cảnh báo"
        title="Tắt"
      >
        ×
      </button>

      <div className="env-toast-panel">
        <div className="env-toast-panel-head">
          <span>{alerts.length} vấn đề · bấm để xem chi tiết</span>
          <button
            type="button"
            className="env-toast-panel-close"
            onClick={() => setExpanded(false)}
            aria-label="Thu gọn"
          >
            Thu gọn
          </button>
        </div>
        <div className="env-toast-list">
          {alerts.map((alert, index) => (
            <div
              key={alert.id}
              className={`env-toast-item ${alert.severity}`}
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <div className="env-toast-item-head">
                <AppIcon name={alert.icon} size={16} />
                <strong>{alert.title}</strong>
                <em>{alert.short}</em>
              </div>
              <p className="env-toast-item-detail">{alert.detail}</p>
              {alert.metric && (
                <div className="env-toast-item-metric">
                  <span>{alert.metric.label}</span>
                  <strong>
                    {alert.metric.current}{alert.metric.unit}
                    <i> / {alert.metric.threshold}</i>
                  </strong>
                </div>
              )}
              <p className="env-toast-item-advice">{alert.advice}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

export default EnvironmentToast;
