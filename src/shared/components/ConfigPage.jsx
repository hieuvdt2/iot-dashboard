import React, { useEffect, useMemo, useState } from 'react';
import AppIcon, { IconHeading } from './AppIcon';
import {
  formatCmForInput,
  formatDistanceLabel,
  loadTankDistanceUnit,
  parseInputToCm,
  saveTankDistanceUnit,
  tankConfigEqual,
  waterDistanceToPercent,
} from '../utils/waterLevel';

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
  tankFullDistance,
  onSaveTankConfig,
  onMarkWaterCalibrated,
  waterTankCalibrated,
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
  const [tankUnit, setTankUnit] = useState(loadTankDistanceUnit);
  const [draftEmptyCm, setDraftEmptyCm] = useState(maxWaterDistance ?? 20);
  const [draftFullCm, setDraftFullCm] = useState(tankFullDistance ?? 2);
  const [emptyText, setEmptyText] = useState(() => formatCmForInput(maxWaterDistance ?? 20, loadTankDistanceUnit()));
  const [fullText, setFullText] = useState(() => formatCmForInput(tankFullDistance ?? 2, loadTankDistanceUnit()));
  const [savingTank, setSavingTank] = useState(false);

  useEffect(() => {
    setDraftEmptyCm(maxWaterDistance ?? 20);
    setDraftFullCm(tankFullDistance ?? 2);
    setEmptyText(formatCmForInput(maxWaterDistance ?? 20, tankUnit));
    setFullText(formatCmForInput(tankFullDistance ?? 2, tankUnit));
  }, [maxWaterDistance, tankFullDistance]);

  const hasUnsavedTank = !tankConfigEqual(
    draftEmptyCm,
    draftFullCm,
    maxWaterDistance ?? 20,
    tankFullDistance ?? 2,
  );

  const handleTankUnitChange = (unit) => {
    saveTankDistanceUnit(unit);
    setTankUnit(unit);
    setEmptyText(formatCmForInput(draftEmptyCm, unit));
    setFullText(formatCmForInput(draftFullCm, unit));
  };

  const handleEmptyInput = (text) => {
    setEmptyText(text);
    const cm = parseInputToCm(text, tankUnit);
    if (cm != null && cm > 0) setDraftEmptyCm(cm);
  };

  const handleFullInput = (text) => {
    setFullText(text);
    const cm = parseInputToCm(text, tankUnit);
    if (cm != null && cm >= 0) setDraftFullCm(cm);
  };

  const applyTankFromSensor = (cm, kind) => {
    const empty = kind === 'empty' ? cm : draftEmptyCm;
    const full = kind === 'full' ? cm : draftFullCm;
    if (kind === 'empty') {
      setDraftEmptyCm(cm);
      setEmptyText(formatCmForInput(cm, tankUnit));
    } else {
      setDraftFullCm(cm);
      setFullText(formatCmForInput(cm, tankUnit));
    }
    onMarkWaterCalibrated?.();
    onSaveTankConfig?.(empty, full);
  };

  const handleSaveTank = async () => {
    if (!canEdit || savingTank) return;
    const empty = parseInputToCm(emptyText, tankUnit) ?? draftEmptyCm;
    const full = parseInputToCm(fullText, tankUnit) ?? draftFullCm;
    if (!empty || empty <= 0 || full == null || full < 0 || empty <= full) return;
    setSavingTank(true);
    try {
      setDraftEmptyCm(empty);
      setDraftFullCm(full);
      onMarkWaterCalibrated?.();
      await onSaveTankConfig?.(empty, full);
    } finally {
      setSavingTank(false);
    }
  };

  const inputStep = tankUnit === 'm' ? '0.001' : '0.1';
  const inputMax = tankUnit === 'm' ? '2' : '200';
  const fullMax = tankUnit === 'm' ? '1.99' : '199';
  const fullMin = tankUnit === 'm' ? '0.005' : '0.5';
  const emptyMin = tankUnit === 'm' ? '0.01' : '1';

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
                  <IconHeading icon="leaf">Cấu hình AUTO</IconHeading>
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
                  <AppIcon name="alert-triangle" size={16} />
                  <span>Tài khoản hiện tại chỉ có quyền xem.</span>
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
                <IconHeading icon="sprout">Mẫu cây trồng</IconHeading>
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
                <IconHeading icon="search">Xem trước tình trạng vườn</IconHeading>
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
      <div className="config-single water-tank-section">
        <div className="config-card water-tank-card">
          <div className="config-header water-tank-header">
            <div>
              <IconHeading icon="container">Cài đặt bể nước</IconHeading>
              <p className="config-status">
                Hiệu chuẩn % mực nước theo bể thực tế — không phụ thuộc loại cây trồng.
              </p>
            </div>
          </div>

          <div className="water-tank-body">
            <div className="water-tank-toolbar">
              <div className="water-tank-unit-toggle" role="group" aria-label="Đơn vị khoảng cách">
                <span className="water-tank-unit-label">Đơn vị:</span>
                {['cm', 'm'].map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    className={`water-tank-unit-btn${tankUnit === unit ? ' active' : ''}`}
                    onClick={() => handleTankUnitChange(unit)}
                    disabled={!canEdit}
                  >
                    {unit}
                  </button>
                ))}
              </div>
              {hasUnsavedTank
                ? <span className="config-sync-badge pending">Chưa lưu</span>
                : waterTankCalibrated && <span className="config-sync-badge synced">Đã lưu</span>}
            </div>

            <label className="water-tank-field">
              <span className="water-tank-label">Mức cạn (0%) — chiều cao bể ({tankUnit})</span>
              <p className="water-tank-hint">
                Số <strong>muc_nuoc</strong> khi bể hết nước (hoặc đo thước từ đáy lên cảm biến). Bể 10 m thì nhập <strong>10 {tankUnit}</strong>.
                {tankUnit === 'm' && ' Arduino gửi cm — app tự quy đổi.'}
              </p>
              <div className="water-tank-input-row">
                <input
                  type="number"
                  className="water-tank-input"
                  min={emptyMin}
                  max={inputMax}
                  step={inputStep}
                  value={emptyText}
                  onChange={(e) => handleEmptyInput(e.target.value)}
                  disabled={!canEdit}
                />
                <span className="water-tank-unit">{tankUnit}</span>
              </div>
            </label>

            <label className="water-tank-field">
              <span className="water-tank-label">Mức đủ nước (100%)</span>
              <p className="water-tank-hint">
                Số <strong>muc_nuoc</strong> khi bạn coi bể <strong>đã đủ nước</strong> (không nhất thiết đổ tới miệng).
                Bể nhỏ: thường <strong>{tankUnit === 'm' ? '0,02–0,03 m' : '2–3 cm'}</strong>.
                Bể cao (vd. chỉ đổ tới 7 m trong bể 10 m): nhập khoảng cách cảm biến lúc đủ nước (vd. <strong>3 {tankUnit}</strong>).
              </p>
              <div className="water-tank-input-row">
                <input
                  type="number"
                  className="water-tank-input"
                  min={fullMin}
                  max={fullMax}
                  step={inputStep}
                  value={fullText}
                  onChange={(e) => handleFullInput(e.target.value)}
                  disabled={!canEdit}
                />
                <span className="water-tank-unit">{tankUnit}</span>
              </div>
            </label>

            <div className="water-tank-actions">
              <button
                type="button"
                className="btn-save water-tank-save"
                onClick={handleSaveTank}
                disabled={!canEdit || savingTank || !hasUnsavedTank}
              >
                {savingTank ? 'Đang lưu...' : 'Lưu cấu hình bể'}
              </button>
            </div>

            <div className="water-tank-calib">
              <p className="water-tank-calib-title"><strong>Hiệu chuẩn nhanh</strong> (tùy chọn — chính xác hơn đo thước):</p>
              <ol className="water-tank-calib-steps">
                <li>Đổ <strong>cạn</strong> → bấm &quot;Ghi mức cạn&quot;, hoặc nhập chiều cao bể rồi <strong>Lưu</strong></li>
                <li>Đổ <strong>đủ nước theo ý bạn</strong> → bấm &quot;Ghi mức đủ nước&quot;</li>
              </ol>
              {sensorData?.muc_nuoc != null && canEdit && (
                <div className="water-tank-calib-btns">
                  <button
                    type="button"
                    className="water-tank-calib-btn"
                    onClick={() => applyTankFromSensor(Number(sensorData.muc_nuoc), 'empty')}
                  >
                    Ghi {formatDistanceLabel(sensorData.muc_nuoc, tankUnit)} → mức cạn (0%)
                  </button>
                  <button
                    type="button"
                    className="water-tank-calib-btn water-tank-calib-btn--full"
                    onClick={() => applyTankFromSensor(Number(sensorData.muc_nuoc), 'full')}
                  >
                    Ghi {formatDistanceLabel(sensorData.muc_nuoc, tankUnit)} → mức đủ nước (100%)
                  </button>
                </div>
              )}
              {!waterTankCalibrated && (
                <p className="water-tank-calib-warn">
                  Chưa hiệu chuẩn — nhập chiều cao bể và mức đầy, hoặc dùng 2 nút ghi bên dưới.
                </p>
              )}
            </div>

            <div className="water-tank-note">
              <p>
                Công thức: <strong>% = (mức cạn − muc_nuoc) / (mức cạn − mức đủ nước) × 100</strong>
              </p>
              <p>
                <strong>muc_nuoc</strong> là khoảng cách siêu âm đo được (<code>duration × 0.034 / 2</code> cm).
                Số càng nhỏ = nước càng nhiều.
              </p>
              <p>
                ESP32 dùng chiều cao bể (mức cạn) để cảnh báo: muc_nuoc &gt; ngưỡng → tắt bơm.
              </p>
              {sensorData?.muc_nuoc != null && (
                <p>
                  Đọc hiện tại: <strong>{formatDistanceLabel(sensorData.muc_nuoc, tankUnit)}</strong>
                  {' → '}
                  <strong>
                    {waterDistanceToPercent(sensorData.muc_nuoc, draftEmptyCm, draftFullCm) ?? '—'}%
                  </strong>
                  {hasUnsavedTank && ' (xem trước — chưa lưu)'}
                </p>
              )}
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
