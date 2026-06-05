import React from 'react';
import AppIcon from './AppIcon';

function EnvironmentAlertBanner({ alerts }) {
  if (!alerts.length) return null;

  const hasDanger = alerts.some((a) => a.severity === 'danger');

  return (
    <div className={`alert-banner ${hasDanger ? 'is-danger' : 'is-warning'}`}>
      <div className="alert-banner-glow" aria-hidden="true" />

      <div className="alert-banner-head">
        <div className="alert-banner-icon-wrap">
          <span className="alert-banner-icon">
            <AppIcon name="alert-triangle" size={20} />
          </span>
          <span className="alert-banner-pulse" aria-hidden="true" />
        </div>
        <div>
          <div className="alert-title">
            {hasDanger ? 'Cảnh báo khẩn' : 'Cảnh báo môi trường'}
          </div>
          <div className="alert-subtitle">
            {alerts.length} vấn đề cần chú ý · di chuột để xem chi tiết
          </div>
        </div>
        <div className={`alert-count ${hasDanger ? 'danger' : 'warning'}`}>
          {alerts.length}
        </div>
      </div>

      <div className="alert-list">
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className={`alert-item ${alert.severity}`}
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <span className="alert-item-icon">
              <AppIcon name={alert.icon} size={16} />
            </span>
            <span className="alert-item-label">{alert.title}</span>
            <span className="alert-item-value">{alert.short}</span>

            <div className="alert-item-tooltip" role="tooltip">
              <div className="alert-tooltip-title">
                <AppIcon name={alert.icon} size={16} />
                <span>{alert.title}</span>
              </div>
              <p className="alert-tooltip-detail">{alert.detail}</p>
              {alert.metric && (
                <div className="alert-tooltip-metric">
                  <span>{alert.metric.label}</span>
                  <strong>
                    {alert.metric.current}{alert.metric.unit}
                    <em> / {alert.metric.threshold}</em>
                  </strong>
                </div>
              )}
              <p className="alert-tooltip-advice">{alert.advice}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EnvironmentAlertBanner;
