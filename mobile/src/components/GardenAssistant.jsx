import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Modal, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { useMqtt } from '../MqttContext';
import { firebaseService } from '../services/firebaseService';
import {
  sendAssistantMessage,
  ASSISTANT_QUICK_PROMPTS,
  THRESHOLD_LABELS,
  buildAssistantContext,
  checkAssistantStatus,
} from '../services/assistantService';

const BASE_PRESETS = [
  { key: 'rau', name: 'Rau', config: { minSoil: 45, targetSoil: 70, maxTemp: 32, minAirHum: 55, maxLux: 18000 } },
  { key: 'xuong_rong', name: 'Xương rồng', config: { minSoil: 15, targetSoil: 30, maxTemp: 38, minAirHum: 35, maxLux: 22000 } },
  { key: 'lan', name: 'Lan', config: { minSoil: 40, targetSoil: 60, maxTemp: 30, minAirHum: 60, maxLux: 16000 } },
  { key: 'cay_canh', name: 'Cây cảnh', config: { minSoil: 35, targetSoil: 55, maxTemp: 34, minAirHum: 50, maxLux: 18000 } },
];

const WELCOME = {
  role: 'assistant',
  content:
    'Xin chào! Tôi là trợ lý vườn thông minh. Hãy mô tả loại cây bạn trồng hoặc hỏi về ngưỡng cảm biến — tôi có thể gợi ý cấu hình phù hợp.',
  suggestion: null,
};

function computeGardenStatus(sensor, thresholds) {
  const soil = sensor?.soilHum ?? sensor?.do_am_dat;
  const temp = sensor?.temperature ?? sensor?.nhiet_do;
  const humi = sensor?.airHum ?? sensor?.do_am_khong_khi;
  const { minSoil = 35, maxTemp = 35, minAirHum = 50 } = thresholds || {};

  if ([soil, temp, humi].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
    return 'Đang cập nhật';
  }
  if (soil < minSoil - 10 || temp > maxTemp + 5 || humi < minAirHum - 10) return 'Nguy hiểm';
  if (soil < minSoil || temp > maxTemp || humi < minAirHum) return 'Cần chú ý';
  return 'Tốt';
}

function SuggestionCard({ suggestion, onApply, applying }) {
  if (!suggestion) return null;
  const entries = Object.entries(THRESHOLD_LABELS)
    .map(([key, label]) => ({ key, label, value: suggestion[key] }))
    .filter((item) => item.value !== undefined);

  return (
    <View style={ss.suggestion}>
      <Text style={ss.suggestionTitle}>
        Gợi ý cấu hình{suggestion.label ? `: ${suggestion.label}` : ''}
      </Text>
      {entries.map((item) => (
        <View key={item.key} style={ss.suggestionRow}>
          <Text style={ss.suggestionLbl}>{item.label}</Text>
          <Text style={ss.suggestionVal}>{item.value}</Text>
        </View>
      ))}
      <TouchableOpacity
        style={[ss.applyBtn, applying && ss.applyBtnDisabled]}
        onPress={() => onApply(suggestion)}
        disabled={applying}
      >
        {applying ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={ss.applyBtnTxt}>Áp dụng lên thiết bị</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[ss.msgRow, isUser && ss.msgRowUser]}>
      {!isUser && (
        <View style={ss.avatar}>
          <Ionicons name="leaf" size={16} color={C.greenDark} />
        </View>
      )}
      <View style={[ss.bubble, isUser ? ss.bubbleUser : ss.bubbleBot]}>
        <Text style={[ss.bubbleTxt, isUser && ss.bubbleTxtUser]}>{message.content}</Text>
      </View>
    </View>
  );
}

export default function GardenAssistant() {
  const { sensorData, autoMode, pumpState, publishConfig } = useMqtt();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [deployed, setDeployed] = useState({});
  const [customPresets, setCustomPresets] = useState([]);
  const [aiOnline, setAiOnline] = useState(null);

  const listRef = useRef(null);

  useEffect(() => {
    const unsub = firebaseService.subscribeDeployedConfig((cfg) => {
      if (cfg) setDeployed(cfg);
    });
    (async () => {
      const cp = await firebaseService.loadCustomPresets();
      setCustomPresets(cp || []);
    })();
    checkAssistantStatus().then((s) => setAiOnline(s?.enabled ?? null));
    return unsub;
  }, []);

  const presets = useMemo(() => [...BASE_PRESETS, ...customPresets], [customPresets]);
  const gardenStatus = useMemo(
    () => computeGardenStatus(sensorData, deployed),
    [sensorData, deployed],
  );
  const context = useMemo(
    () => buildAssistantContext({
      sensorData,
      deployedThresholds: deployed,
      presets,
      gardenStatus,
      autoMode,
      pumpStatus: pumpState,
    }),
    [sensorData, deployed, presets, gardenStatus, autoMode, pumpState],
  );

  useEffect(() => {
    if (!open) return;
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, loading, open]);

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError('');
    setInput('');
    const nextMessages = [...messages, { role: 'user', content: trimmed, suggestion: null }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const payload = nextMessages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map(({ role, content }) => ({ role, content }));
      const data = await sendAssistantMessage({ messages: payload, context });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, suggestion: data.suggestion || null },
      ]);
    } catch (err) {
      setError(err.message || 'Không thể kết nối trợ lý AI');
    } finally {
      setLoading(false);
    }
  }, [messages, loading, context]);

  const handleApply = useCallback((suggestion) => {
    const { label, ...config } = suggestion;
    Alert.alert(
      'Áp dụng gợi ý AI',
      `Gửi cấu hình${label ? ` "${label}"` : ''} lên ESP32?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Áp dụng',
          onPress: async () => {
            setApplying(true);
            try {
              await firebaseService.saveDraftThresholds(config);
              await firebaseService.saveConfig(config);
              publishConfig(config);
              setDeployed(config);
              Alert.alert('Thành công', 'Đã áp dụng gợi ý lên thiết bị');
            } catch (e) {
              Alert.alert('Lỗi', e.message || 'Không thể áp dụng cấu hình');
            } finally {
              setApplying(false);
            }
          },
        },
      ],
    );
  }, [publishConfig]);

  return (
    <>
      {!open && (
        <TouchableOpacity
          style={ss.fab}
          onPress={() => setOpen(true)}
          activeOpacity={0.85}
          accessibilityLabel="Mở trợ lý vườn"
        >
          <Ionicons name="chatbubbles" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={ss.safe}>
          <KeyboardAvoidingView
            style={ss.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={ss.header}>
              <View style={ss.headerIcon}>
                <Ionicons name="leaf" size={22} color={C.greenDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ss.headerTitle}>Trợ lý vườn</Text>
                <Text style={ss.headerSub}>
                  {aiOnline === false ? 'AI chưa sẵn sàng' : 'Hỏi về cây trồng & ngưỡng'}
                </Text>
              </View>
              <TouchableOpacity style={ss.closeBtn} onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={C.text2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={ss.chips}
            >
              {ASSISTANT_QUICK_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={ss.chip}
                  disabled={loading}
                  onPress={() => sendMessage(prompt)}
                >
                  <Text style={ss.chipTxt}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView
              ref={listRef}
              style={ss.messages}
              contentContainerStyle={ss.messagesContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            >
              {messages.map((msg, i) => (
                <View key={`${msg.role}-${i}`}>
                  <MessageBubble message={msg} />
                  {msg.role === 'assistant' && msg.suggestion && (
                    <SuggestionCard
                      suggestion={msg.suggestion}
                      onApply={handleApply}
                      applying={applying}
                    />
                  )}
                </View>
              ))}
              {loading && (
                <View style={ss.msgRow}>
                  <View style={ss.avatar}>
                    <Ionicons name="leaf" size={16} color={C.greenDark} />
                  </View>
                  <View style={[ss.bubble, ss.bubbleBot]}>
                    <Text style={ss.typing}>Đang suy nghĩ...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {error ? <Text style={ss.error}>{error}</Text> : null}

            <View style={ss.inputRow}>
              <TextInput
                style={ss.input}
                placeholder="Nhập câu hỏi..."
                placeholderTextColor={C.text3}
                value={input}
                onChangeText={setInput}
                editable={!loading}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(input)}
              />
              <TouchableOpacity
                style={[ss.sendBtn, (!input.trim() || loading) && ss.sendBtnDisabled]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || loading}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const ss = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 84,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.greenMid,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 8,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 12, color: C.text3, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 280,
  },
  chipTxt: { fontSize: 12, color: C.text2, fontWeight: '500' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleBot: {
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: C.greenMid,
    borderBottomRightRadius: 4,
  },
  bubbleTxt: { fontSize: 15, lineHeight: 22, color: C.text },
  bubbleTxtUser: { color: '#fff' },
  typing: { fontSize: 14, color: C.text3, fontStyle: 'italic' },
  suggestion: {
    marginLeft: 40,
    marginBottom: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 14,
  },
  suggestionTitle: { fontSize: 13, fontWeight: '700', color: C.greenDark, marginBottom: 10 },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  suggestionLbl: { fontSize: 12, color: C.text2, flex: 1 },
  suggestionVal: { fontSize: 12, fontWeight: '700', color: C.text },
  applyBtn: {
    marginTop: 12,
    backgroundColor: C.greenMid,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  applyBtnDisabled: { opacity: 0.6 },
  applyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  error: {
    color: C.red,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 6,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: C.bgCard,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  input: {
    flex: 1,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: C.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.greenMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
