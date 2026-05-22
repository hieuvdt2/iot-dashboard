import React, { useState } from 'react';

function EnvironmentToast({ alerts }) {
  const [expanded, setExpanded] = useState(false);

  if (!alerts.length) return null;

  const hasDanger = alerts.some((a) => a.severity === 'danger');
  const primary = alerts[0];

  return (
    <div
      className={`env-toast ${hasDanger ? 'is-danger' : 'is-warning'} ${expanded ? 'is-expanded' : ''}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div
        className="env-toast-compact"
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((value) => !value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((value) => !value);
          }
        }}
        aria-expanded={expanded}
      >
        <div className="env-toast-icon-wrap">
          <span className="env-toast-icon">{primary.icon || '⚠️'}</span>
          <span className="env-toast-pulse" aria-hidden="true" />
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
        <span className="env-toast-chevron" aria-hidden="true">{expanded ? '▾' : '▴'}</span>
      </div>

      <div className="env-toast-panel">
        <div className="env-toast-panel-head">
          {alerts.length} vấn đề · di chuột hoặc bấm để xem chi tiết
        </div>
        <div className="env-toast-list">
          {alerts.map((alert, index) => (
            <div
              key={alert.id}
              className={`env-toast-item ${alert.severity}`}
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <div className="env-toast-item-head">
                <span>{alert.icon}</span>
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
  );
}

export default EnvironmentToast;
