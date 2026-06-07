import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

/** Chấm tròn + vòng lan nhẹ — kiểu indicator live */
function StatusDot({ active, color, size = 10 }) {
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      ring.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, ring]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.55, 0.4, 0] });

  const dot = size;
  const wrap = dot + 12;

  return (
    <View style={[s.dotWrap, { width: wrap, height: wrap }]}>
      {active && (
        <Animated.View
          style={[
            s.ring,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              borderColor: color,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
      )}
      <View
        style={[
          s.dot,
          {
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: active ? color : '#cbd5e1',
          },
        ]}
      />
    </View>
  );
}

function StatusChip({ active, activeLabel, idleLabel, activeColor, idleColor, activeBg, idleBg, activeBorder, idleBorder }) {
  const color = active ? activeColor : idleColor;
  return (
    <View style={[s.chip, active ? activeBg : idleBg, active ? activeBorder : idleBorder]}>
      <StatusDot active={active} color={activeColor} />
      <Text style={[s.chipTxt, { color }]}>{active ? activeLabel : idleLabel}</Text>
    </View>
  );
}

export default function WateringStatusBar({ pumpState, autoMode, compact = false }) {
  const watering = pumpState === 'on';

  return (
    <View style={[s.bar, compact && s.barCompact]}>
      <StatusChip
        active={watering}
        activeLabel="Đang tưới"
        idleLabel="Không tưới"
        activeColor="#16a34a"
        idleColor="#64748b"
        activeBg={s.chipOn}
        idleBg={s.chipOff}
        activeBorder={s.borderOn}
        idleBorder={s.borderOff}
      />
      <StatusChip
        active={autoMode}
        activeLabel="Tự động"
        idleLabel="Thủ công"
        activeColor="#2563eb"
        idleColor="#64748b"
        activeBg={s.chipAuto}
        idleBg={s.chipOff}
        activeBorder={s.borderAuto}
        idleBorder={s.borderOff}
      />
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  barCompact: { marginHorizontal: 0, marginBottom: 0 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipOn: { backgroundColor: '#f0fdf4' },
  chipOff: { backgroundColor: '#fff' },
  chipAuto: { backgroundColor: '#eff6ff' },
  borderOn: { borderColor: '#bbf7d0' },
  borderOff: { borderColor: '#e2ece5' },
  borderAuto: { borderColor: '#bfdbfe' },
  chipTxt: { fontSize: 13, fontWeight: '600' },
  dotWrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  dot: {},
});
