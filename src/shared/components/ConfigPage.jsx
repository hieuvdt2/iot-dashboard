import React, { useMemo, useState } from 'react';

// maxWaterDistance là cài đặt phần cứng, không phải thuộc tính cây trồng
// nên không đưa vào preset. Xem mục "Cài đặt bể nước" riêng bên dưới.
const THRESHOLD_FIELDS = [
  { key: 'minSoil',    label: 'Độ ẩm đất tối thiểu (%)' },
  { key: 'targetSoil', label: 'Mức độ ẩm đất mục tiêu (%)' },
  { key: 'maxTemp',    label: 'Nhiệt độ tối đa (°C)' },
  { key: 'minAirHum',  label: 'Độ ẩm KK tối thiểu (%)' },
  { key: 'maxLux',     label: 'Cường độ ánh sáng tối đa (lux)' },
];

const toThresholdForm = (source) => ({
  minSoil:    source.minSoil    ?? '',
  targetSoil: source.targetSoil ?? '',
  maxTemp:    source.maxTemp    ?? '',
  minAirHum:  source.minAirHum  ?? '',
  maxLux:     source.maxLux     ?? '',
});

const isCompleteNumber = (value) => {
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  return /^-?\d+(\.\d+)?$/.test(trimmed) && !Number.isNaN(Number(trimmed));
};

const thresholdsEqual = (a, b) => (
  THRESHOLD_FIELDS.every((field) => Number(a?.[field.key]) === Number(b?.[field.key]))
);

const parseThresholdForm = (form) => {
  const errors = {};
  const payload = {};

  THRESHOLD_FIELDS.forEach((field) => {
    const raw = String(form[field.key] ?? '').trim();
    if (!isCompleteNumber(raw)) {
      errors[field.key] = 'Chỉ được nhập số hợp lệ';
      return;
    }
    payload[field.key] = Number(raw);
  });

  return { errors, payload };
};

function ThresholdNumberField({ field, value, error, onChange }) {
  return (
    <label className={`modal-field ${error ? 'has-error' : ''}`}>
      <span>{field.label}</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="Nhập số"
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function ConfigPage({
  presets,
  selectedPreset,
  configReady,
  draftThresholds,
  deployedThresholds,
  hasUnsavedDraft,
  sensorData,
  maxWaterDistance,
  onMaxWaterDistanceChange,
  onSelectPreset,
  onApplyDraft,
  onDiscardDraft,
  onSave,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
  canEdit,
}) {
  const [activeSection, setActiveSection] = useState('custom');
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingKey, setEditingKey] = useState('');
  const [formValues, setFormValues] = useState({
    name: '',
    ...toThresholdForm(draftThresholds),
  });
  const [thresholdForm, setThresholdForm] = useState(toThresholdForm(draftThresholds));
  const [thresholdErrors, setThresholdErrors] = useState({});
  const [presetFieldErrors, setPresetFieldErrors] = useState({});
  const [confirmState, setConfirmState] = useState(null);

  const closeConfirm = () => setConfirmState(null);

  const runConfirmedSave = () => {
    closeConfirm();
    onSave();
  };

  const handleSaveClick = () => {
    if (!canEdit || !hasUnsavedDraft) return;

    if (activeSection === 'custom') {
      if (appliedPreset && !thresholdsEqual(draftThresholds, appliedPreset.config)) {
        setConfirmState({
          title: 'Thay mẫu bằng tự cấu hình?',
          message: `Thiết bị đang áp dụng mẫu "${appliedPreset.name}". Gửi cấu hình tự chỉnh sẽ thay thế mẫu này. Bạn có chắc chắn muốn tiếp tục?`,
          confirmLabel: 'Áp dụng tự cấu hình',
          onConfirm: runConfirmedSave,
        });
        return;
      }
    }

    if (activeSection === 'preset') {
      const targetPreset = presets.find((preset) => preset.key === selectedPreset);
      if (!targetPreset) return;

      const replacingCustom = !appliedPreset;
      const replacingOtherPreset = appliedPreset && appliedPreset.key !== selectedPreset;

      if (replacingCustom || replacingOtherPreset) {
        const currentLabel = appliedPreset
          ? `mẫu "${appliedPreset.name}"`
          : 'cấu hình tự chỉnh';
        setConfirmState({
          title: 'Áp dụng mẫu mới?',
          message: `Mẫu "${targetPreset.name}" sẽ thay thế ${currentLabel} đang chạy trên thiết bị. Bạn có muốn áp dụng mẫu này?`,
          confirmLabel: `Áp dụng "${targetPreset.name}"`,
          onConfirm: runConfirmedSave,
        });
        return;
      }
    }

    onSave();
  };

  const requestPresetSelection = (presetKey) => {
    if (!canEdit || !presetKey || presetKey === selectedPreset) return;

    const targetPreset = presets.find((preset) => preset.key === presetKey);
    if (!targetPreset) return;

    const needsConfirm = !appliedPreset || appliedPreset.key !== presetKey;

    if (needsConfirm) {
      const currentLabel = appliedPreset
        ? `mẫu "${appliedPreset.name}"`
        : 'cấu hình tự chỉnh';
      setConfirmState({
        title: 'Chọn mẫu này?',
        message: `Mẫu "${targetPreset.name}" sẽ thay thế ${currentLabel} trong bản nháp. Bạn vẫn cần bấm "Áp dụng lên thiết bị" để gửi lên thiết bị.`,
        confirmLabel: `Chọn "${targetPreset.name}"`,
        onConfirm: () => {
          closeConfirm();
          onSelectPreset(presetKey);
        },
      });
      return;
    }

    onSelectPreset(presetKey);
  };

  const handlePresetSelectChange = (event) => {
    const presetKey = event.target.value;
    if (!presetKey) {
      onSelectPreset('');
      return;
    }
    requestPresetSelection(presetKey);
  };

  const configItems = THRESHOLD_FIELDS.map((field) => ({
    label: field.label,
    value: draftThresholds[field.key],
    deployedValue: deployedThresholds[field.key],
    key: field.key,
  }));

  const selectedPresetConfig = useMemo(() => {
    const selected = presets.find((preset) => preset.key === selectedPreset);
    return selected ? selected.config : null;
  }, [presets, selectedPreset]);

  const appliedPreset = useMemo(
    () => presets.find((preset) => thresholdsEqual(preset.config, deployedThresholds)),
    [presets, deployedThresholds]
  );

  const presetDraftItems = THRESHOLD_FIELDS.map((field) => ({
    label: field.label,
    value: draftThresholds[field.key],
    deployedValue: deployedThresholds[field.key],
    key: field.key,
  }));

  const preview = useMemo(() => {
    if (!sensorData || !selectedPresetConfig) return null;
    const alerts = [];
    if (sensorData.do_am_dat < selectedPresetConfig.minSoil) {
      alerts.push('Đất đang khô, cần tưới');
    }
    if (sensorData.nhiet_do > selectedPresetConfig.maxTemp) {
      alerts.push('Nhiệt độ cao');
    }
    if (sensorData.do_am_khong_khi < selectedPresetConfig.minAirHum) {
      alerts.push('Không khí khô');
    }
    if (sensorData.anh_sang > selectedPresetConfig.maxLux) {
      alerts.push('Ánh sáng quá mạnh');
    }

    let status = 'Tốt';
    if (alerts.length === 1) status = 'Cần chú ý';
    if (alerts.length >= 2) status = 'Nguy hiểm';

    return {
      alerts,
      status,
      needsWatering: sensorData.do_am_dat < selectedPresetConfig.minSoil,
    };
  }, [sensorData, selectedPresetConfig]);

  const customPresets = useMemo(
    () => presets.filter((preset) => preset.isCustom),
    [presets]
  );

  const handleNumericChange = (key, rawValue, setForm, setErrors) => {
    const normalized = rawValue.replace(',', '.');

    if (/[a-zA-Z\u00C0-\u1EF9]/.test(normalized)) {
      setErrors((prev) => ({
        ...prev,
        [key]: 'Chỉ được nhập số, không nhập chữ',
      }));
      return;
    }

    if (normalized !== '' && !/^-?\d*\.?\d*$/.test(normalized)) {
      setErrors((prev) => ({
        ...prev,
        [key]: 'Giá trị số không hợp lệ',
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setForm((prev) => ({ ...prev, [key]: normalized }));
  };

  const openThresholdModal = () => {
    if (!canEdit) return;
    setThresholdForm(toThresholdForm(draftThresholds));
    setThresholdErrors({});
    setIsThresholdModalOpen(true);
  };

  const closeThresholdModal = () => {
    setIsThresholdModalOpen(false);
    setThresholdErrors({});
  };

  const handleThresholdModalSave = () => {
    if (!canEdit) return;
    const { errors, payload } = parseThresholdForm(thresholdForm);
    if (Object.keys(errors).length > 0) {
      setThresholdErrors(errors);
      return;
    }
    onApplyDraft(payload);
    setIsThresholdModalOpen(false);
    setThresholdErrors({});
  };

  const openCreateModal = () => {
    if (!canEdit) return;
    setModalMode('create');
    setEditingKey('');
    setFormValues({
      name: '',
      ...toThresholdForm(draftThresholds),
    });
    setPresetFieldErrors({});
    setIsPresetModalOpen(true);
  };

  const openEditModal = (preset) => {
    if (!canEdit) return;
    setModalMode('edit');
    setEditingKey(preset.key);
    setFormValues({
      name: preset.name,
      ...toThresholdForm(preset.config),
    });
    setPresetFieldErrors({});
    setIsPresetModalOpen(true);
  };

  const closePresetModal = () => {
    setIsPresetModalOpen(false);
    setPresetFieldErrors({});
  };

  const handlePresetModalSave = () => {
    if (!canEdit) return;
    const trimmed = formValues.name.trim();
    if (!trimmed) {
      setPresetFieldErrors({ name: 'Vui lòng nhập tên mẫu' });
      return;
    }
    const { errors, payload } = parseThresholdForm(formValues);
    if (Object.keys(errors).length > 0) {
      setPresetFieldErrors(errors);
      return;
    }
    if (modalMode === 'create') {
      onAddPreset(trimmed, payload);
    } else {
      onUpdatePreset(editingKey, trimmed, payload);
    }
    setIsPresetModalOpen(false);
    setPresetFieldErrors({});
  };

  const handleDeletePreset = (presetKey) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa mẫu này?');
    if (!confirmed) return;
    onDeletePreset(presetKey);
  };

  const previewStatusClass = preview
    ? preview.status === 'Tốt'
      ? 'ok'
      : preview.status === 'Cần chú ý'
        ? 'warn'
        : 'danger'
    : '';

  return (
    <>
      <section className="section config-shell">
        <div className="config-tabs">
          <button
            type="button"
            className={`config-tab ${activeSection === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveSection('custom')}
          >
            Tự cấu hình
          </button>
          <button
            type="button"
            className={`config-tab ${activeSection === 'preset' ? 'active' : ''}`}
            onClick={() => setActiveSection('preset')}
          >
            Mẫu cây trồng
          </button>
        </div>

        {activeSection === 'custom' ? (
          <div className="config-single config-single-centered">
            <div className="config-card config-card-large">
              <div className="config-header">
                <div>
                  <h3>🌿 Cấu hình AUTO</h3>
                  <div className="config-status-row">
                    <span className={`config-status ${configReady ? 'ready' : 'empty'}`}>
                      {configReady ? 'Thiết bị đã nhận cài đặt' : 'Thiết bị chưa có cài đặt'}
                    </span>
                    {hasUnsavedDraft ? (
                      <span className="config-sync-badge pending">Chưa áp dụng</span>
                    ) : (
                      <span className="config-sync-badge synced">Đã đồng bộ</span>
                    )}
                  </div>
                </div>
                <div className="config-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={openThresholdModal}
                    disabled={!canEdit}
                  >
                    Chỉnh sửa
                  </button>
                  {hasUnsavedDraft && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={onDiscardDraft}
                      disabled={!canEdit}
                    >
                      Hủy thay đổi
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-save"
                    onClick={handleSaveClick}
                    disabled={!canEdit || !hasUnsavedDraft}
                  >
                    Áp dụng lên thiết bị
                  </button>
                </div>
              </div>

              <p className="config-note">
                Chỉnh sửa tạo bản nháp. Thiết bị chỉ cập nhật khi bạn bấm &quot;Áp dụng lên thiết bị&quot;.
              </p>

              {!canEdit && (
                <div className="config-warning">
                  ⚠️ Tài khoản hiện tại chỉ có quyền xem.
                </div>
              )}

              {hasUnsavedDraft && (
                <div className="config-draft-hint">
                  Bạn đang xem bản nháp mới. Thiết bị vẫn chạy cấu hình cũ cho đến khi gửi.
                </div>
              )}

              <div className="config-list">
                {configItems.map((item) => (
                  <div
                    key={item.key}
                    className={`config-item ${hasUnsavedDraft && item.value !== item.deployedValue ? 'changed' : ''}`}
                  >
                    <span>{item.label}</span>
                    <strong>{item.value ?? '--'}</strong>
                    {hasUnsavedDraft && item.value !== item.deployedValue && (
                      <span className="config-item-old">Thiết bị: {item.deployedValue ?? '--'}</span>
                      )}
                    </div>
                  ))}
                </div>
            </div>
          </div>
        ) : (
          <div className="preset-layout preset-layout-centered">
            <div className="preset-card preset-card-large">
              <div className="preset-header">
                <h3>🌱 Mẫu cây trồng</h3>
                <p>Chọn mẫu để xem trước — thiết bị chỉ cập nhật khi bấm &quot;Áp dụng lên thiết bị&quot;.</p>
              </div>

              <div className="config-status-row">
                {appliedPreset ? (
                  <span className="config-status ready">
                    Thiết bị đang dùng: <strong>{appliedPreset.name}</strong>
                  </span>
                ) : (
                  <span className="config-status empty">Thiết bị chưa khớp mẫu có sẵn</span>
                )}
                {hasUnsavedDraft ? (
                  <span className="config-sync-badge pending">Chưa áp dụng</span>
                ) : (
                  <span className="config-sync-badge synced">Đã đồng bộ</span>
                )}
              </div>

              <select
                className="preset-select"
                value={selectedPreset}
                onChange={handlePresetSelectChange}
                disabled={!canEdit}
              >
                <option value="">— Chọn mẫu —</option>
                {presets.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.name}
                  </option>
                ))}
              </select>

              {!selectedPreset && (
                <div className="config-draft-hint muted">
                  Chưa chọn mẫu — thiết bị vẫn giữ cài đặt hiện tại.
                </div>
              )}

              {selectedPreset && hasUnsavedDraft && (
                <div className="config-draft-hint">
                  Đã chọn mẫu mới. Bấm &quot;Áp dụng lên thiết bị&quot; để gửi lên thiết bị.
                </div>
              )}

              {selectedPreset && (
                <div className="config-list preset-config-list">
                  {presetDraftItems.map((item) => (
                    <div
                      key={item.key}
                      className={`config-item ${hasUnsavedDraft && item.value !== item.deployedValue ? 'changed' : ''}`}
                    >
                      <span>{item.label}</span>
                      <strong>{item.value ?? '--'}</strong>
                      {hasUnsavedDraft && item.value !== item.deployedValue && (
                        <span className="config-item-old">Thiết bị: {item.deployedValue ?? '--'}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="preset-actions preset-actions-main">
                <button
                  type="button"
                  className="btn-save"
                  onClick={handleSaveClick}
                  disabled={!canEdit || !hasUnsavedDraft}
                >
                  Áp dụng lên thiết bị
                </button>
                {hasUnsavedDraft && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={onDiscardDraft}
                    disabled={!canEdit}
                  >
                    Hủy thay đổi
                  </button>
                )}
                <button className="btn-ghost" type="button" onClick={openCreateModal} disabled={!canEdit}>
                  Thêm mẫu
                </button>
              </div>

              {customPresets.length > 0 && (
                <div className="preset-list">
                  <div className="preset-list-title">Mẫu tùy chỉnh</div>
                  {customPresets.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className={`preset-row ${selectedPreset === preset.key ? 'active' : ''}`}
                      onClick={() => requestPresetSelection(preset.key)}
                      disabled={!canEdit}
                    >
                      <div>
                        <strong>{preset.name}</strong>
                        <span>Bấm để chọn</span>
                      </div>
                      <div className="preset-row-actions">
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(preset);
                          }}
                          disabled={!canEdit}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="btn-ghost danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeletePreset(preset.key);
                          }}
                          disabled={!canEdit}
                        >
                          Xóa
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="preview-card preview-card-large">
              <div className="preview-header">
                <h3>🔎 Xem trước tình trạng vườn</h3>
                <span>Dựa trên mẫu đang chọn (chưa áp dụng)</span>
              </div>
              {!selectedPreset && (
                <div className="preview-empty">
                  Chọn mẫu để xem trước ngưỡng và tình trạng vườn.
                </div>
              )}
              {selectedPreset && !selectedPresetConfig && (
                <div className="preview-empty">
                  Mẫu không hợp lệ.
                </div>
              )}
              {selectedPresetConfig && !sensorData && (
                <div className="preview-empty">
                  Chưa có dữ liệu cảm biến để xem trước.
                </div>
              )}
              {selectedPresetConfig && preview && (
                <div className="preview-body">
                  <div className={`preview-status ${previewStatusClass}`}>
                    {preview.status}
                  </div>
                  <div className="preview-row">
                    <span>Cần tưới:</span>
                    <strong>{preview.needsWatering ? 'Có' : 'Không'}</strong>
                  </div>
                  <div className="preview-list">
                    {preview.alerts.length > 0 ? (
                      preview.alerts.map((item, index) => (
                        <div key={`${item}-${index}`} className="preview-item">
                          {item}
                        </div>
                      ))
                    ) : (
                      <div className="preview-item muted">Không có cảnh báo.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ─── Cài đặt bể nước (device-level, không phụ thuộc loại cây) ─── */}
      <div className="config-single" style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="config-card" style={{ marginTop: 0 }}>
          <div className="config-header">
            <div>
              <h3>🪣 Cài đặt bể nước</h3>
              <p className="config-status" style={{ marginTop: 4 }}>
                Ngưỡng xác định bể còn nước hay không — không phụ thuộc loại cây trồng.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 600 }}>
                Khoảng cách cảnh báo cạn bể (cm)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={maxWaterDistance ?? 20}
                  onChange={(e) => onMaxWaterDistanceChange(Number(e.target.value))}
                  disabled={!canEdit}
                  style={{
                    width: 80, padding: '7px 10px', borderRadius: 7,
                    border: '1px solid var(--border)', background: 'var(--bg)',
                    color: 'var(--text)', fontSize: '0.9rem', fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>cm</span>
              </div>
            </div>
            <div style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              background: 'var(--blue-light)', border: '1px solid #bfdbfe',
              fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.55,
            }}>
              <strong>Cảm biến đo khoảng cách từ đầu bể xuống mặt nước.</strong><br />
              Nếu khoảng cách &gt; {maxWaterDistance ?? 20} cm → cảnh báo &quot;Nước thấp / Cạn&quot; và khoá bơm an toàn.
            </div>
          </div>
        </div>
      </div>

      {confirmState && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card confirm-modal">
            <div className="modal-header">
              <h3>{confirmState.title}</h3>
            </div>
            <div className="modal-body">
              <p className="confirm-modal-message">{confirmState.message}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={closeConfirm}>
                Hủy
              </button>
              <button type="button" className="btn-save" onClick={confirmState.onConfirm}>
                {confirmState.confirmLabel || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isThresholdModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-card-wide">
            <div className="modal-header">
              <h3>Chỉnh sửa ngưỡng AUTO</h3>
              <button type="button" className="btn-ghost" onClick={closeThresholdModal}>
                Đóng
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-note">
                Thay đổi sẽ lưu vào bản nháp. Bấm &quot;Lưu nháp&quot; rồi &quot;Áp dụng lên thiết bị&quot; để gửi lên thiết bị.
              </p>
              {Object.keys(thresholdErrors).length > 0 && (
                <div className="form-alert">
                  Vui lòng sửa các ô báo đỏ — chỉ nhập số hợp lệ.
                </div>
              )}
              <div className="modal-grid">
                {THRESHOLD_FIELDS.map((field) => (
                  <ThresholdNumberField
                    key={field.key}
                    field={field}
                    value={thresholdForm[field.key]}
                    error={thresholdErrors[field.key]}
                    onChange={(key, value) => handleNumericChange(
                      key,
                      value,
                      setThresholdForm,
                      setThresholdErrors
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={closeThresholdModal}>
                Hủy
              </button>
              <button type="button" className="btn-save" onClick={handleThresholdModalSave}>
                Lưu nháp
              </button>
            </div>
          </div>
        </div>
      )}

      {isPresetModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card modal-card-wide">
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Thêm mẫu mới' : 'Sửa mẫu'}</h3>
              <button type="button" className="btn-ghost" onClick={closePresetModal}>
                Đóng
              </button>
            </div>
            <div className="modal-body">
              <label className={`modal-field ${presetFieldErrors.name ? 'has-error' : ''}`}>
                <span>Tên mẫu</span>
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(e) => {
                    setPresetFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                    setFormValues((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }));
                  }}
                />
                {presetFieldErrors.name && (
                  <span className="field-error">{presetFieldErrors.name}</span>
                )}
              </label>
              {Object.keys(presetFieldErrors).length > 0 && !presetFieldErrors.name && (
                <div className="form-alert">
                  Vui lòng sửa các ô báo đỏ — chỉ nhập số hợp lệ.
                </div>
              )}
              <div className="modal-grid">
                {THRESHOLD_FIELDS.map((field) => (
                  <ThresholdNumberField
                    key={field.key}
                    field={field}
                    value={formValues[field.key]}
                    error={presetFieldErrors[field.key]}
                    onChange={(key, value) => handleNumericChange(
                      key,
                      value,
                      setFormValues,
                      setPresetFieldErrors
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-ghost" onClick={closePresetModal}>
                Hủy
              </button>
              <button type="button" className="btn-save" onClick={handlePresetModalSave}>
                {modalMode === 'create' ? 'Lưu mẫu' : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ConfigPage;
