import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseService } from '../services/firebaseService';
import {
  WATER_CALIBRATION_KEY,
  splitDeviceConfig,
  buildFirebaseConfigPayload,
  DEFAULT_TANK_FULL_DISTANCE,
  isTankCalibrationReady,
} from '../utils/waterLevel';

export function useTankCalibration() {
  const [maxWaterDist, setMaxWaterDist] = useState(null);
  const [tankFullDist, setTankFullDist] = useState(null);
  const [calibrated, setCalibrated] = useState(false);
  const migrateRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [emptyV, fullV, calibV] = await Promise.all([
          AsyncStorage.getItem('iot_max_water_distance'),
          AsyncStorage.getItem('iot_tank_full_distance'),
          AsyncStorage.getItem(WATER_CALIBRATION_KEY),
        ]);
        const isCalib = calibV === 'true';
        if (isCalib || (emptyV && fullV)) {
          if (emptyV) setMaxWaterDist(Number(emptyV));
          if (fullV) setTankFullDist(Number(fullV));
          if (isCalib) setCalibrated(true);
        }
      } catch {}
    })();

    const unsub = firebaseService.subscribeConfig(async (cfg) => {
      const { thresholds, tankEmpty, tankFull, tankCalibrated } = splitDeviceConfig(cfg);
      if (tankCalibrated) {
        try {
          if (tankEmpty != null && tankEmpty > 0) {
            setMaxWaterDist(tankEmpty);
            await AsyncStorage.setItem('iot_max_water_distance', String(tankEmpty));
          }
          if (tankFull != null && tankFull >= 0) {
            setTankFullDist(tankFull);
            await AsyncStorage.setItem('iot_tank_full_distance', String(tankFull));
          }
          setCalibrated(true);
          await AsyncStorage.setItem(WATER_CALIBRATION_KEY, 'true');
        } catch {}
        return;
      }

      if (migrateRef.current) return;
      try {
        const calibV = await AsyncStorage.getItem(WATER_CALIBRATION_KEY);
        if (calibV !== 'true') return;
        const emptyV = await AsyncStorage.getItem('iot_max_water_distance');
        const fullV = await AsyncStorage.getItem('iot_tank_full_distance');
        const empty = emptyV ? Number(emptyV) : 0;
        const full = fullV ? Number(fullV) : DEFAULT_TANK_FULL_DISTANCE;
        if (empty > 0) {
          migrateRef.current = true;
          await firebaseService.saveConfig(
            buildFirebaseConfigPayload(thresholds, empty, full, true),
          );
        }
      } catch {}
    });

    return unsub;
  }, []);

  return {
    maxWaterDist,
    tankFullDist,
    calibrated,
    isReady: isTankCalibrationReady(maxWaterDist, tankFullDist),
  };
}
