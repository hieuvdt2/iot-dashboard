import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import MqttService from './services/mqttService';
import { firebaseService } from './services/firebaseService';
import { normalizeSensorPayload } from './utils/normalizeSensor';

const MqttContext = createContext(null);

export function MqttProvider({ children }) {
  const mqttRef = useRef(null);
  const [mqttStatus, setMqttStatus]   = useState('offline');
  const [sensorData, setSensorData]   = useState({});
  const [pumpState, setPumpState]     = useState('off');
  const [autoMode, setAutoMode]       = useState(false);
  const [history, setHistory]         = useState([]);

  useEffect(() => {
    const mqtt = new MqttService();
    mqttRef.current = mqtt;

    mqtt.on('status', setMqttStatus);

    mqtt.on('sensorData', (d) => {
      setSensorData(prev => ({ ...prev, ...d }));
      setHistory(prev => {
        const entry = {
          timeLabel: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          temperature: d.temperature ?? null,
          soilHum:     d.soilHum    ?? null,
          airHum:      d.airHum     ?? null,
          waterLevel:  d.waterLevel ?? null,
        };
        return [entry, ...prev].slice(0, 50);
      });
    });

    mqtt.on('pumpStatus', (s) => {
      if (s === 'DANG_TUOI' || s === 'on' || s === 1) setPumpState('on');
      else setPumpState('off');
    });

    mqtt.on('autoMode', (val) => {
      setAutoMode(val === 'BAT' || val === true || val === 'on');
    });

    mqtt.connect();

    const unsubFirebase = firebaseService.subscribeLatest((data) => {
      if (!data) return;
      const n = normalizeSensorPayload(data);
      setSensorData((prev) => ({ ...prev, ...n }));
    });

    return () => {
      unsubFirebase();
      mqtt.disconnect();
    };
  }, []);

  const publishControl = useCallback((cmd) => {
    mqttRef.current?.publish('esp32/control', cmd);
  }, []);

  const publishConfig = useCallback((config) => {
    mqttRef.current?.publish('esp32/config', JSON.stringify(config));
  }, []);

  return (
    <MqttContext.Provider value={{
      mqttStatus, sensorData, pumpState, autoMode, history,
      setHistory, setPumpState, setAutoMode,
      publishControl, publishConfig,
    }}>
      {children}
    </MqttContext.Provider>
  );
}

export function useMqtt() {
  return useContext(MqttContext);
}
