import { initializeApp, getApps } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  off,
  set,
  get,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCR5BxrCoh0n88EcYKbN0rZe1j5Eq3GUtY',
  authDomain: 'smart-garden-eace0.firebaseapp.com',
  databaseURL: 'https://smart-garden-eace0-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'smart-garden-eace0',
  storageBucket: 'smart-garden-eace0.firebasestorage.app',
  messagingSenderId: '150795132598',
  appId: '1:150795132598:web:8a85b66faa8892de845017',
};

const DEVICE_ID = 'esp32_01';

// Khởi tạo Firebase (tránh khởi tạo lại)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

// Auth với AsyncStorage persistence để lưu session
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  auth = getAuth(app);
}

const withDevicePath = (path) => `devices/${DEVICE_ID}/${path}`;

export const firebaseService = {
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  async ensureUserProfile(user) {
    if (!user?.uid) return;
    const profileRef = ref(db, `users/${user.uid}`);
    const snap = await get(profileRef);
    if (!snap.exists()) {
      await set(profileRef, {
        email: user.email || '',
        createdAt: Date.now(),
      });
    } else {
      const existing = snap.val() || {};
      if (!existing.email && user.email) {
        await set(profileRef, { ...existing, email: user.email });
      }
    }
    const roleRef = ref(db, `roles/${user.uid}`);
    const roleSnap = await get(roleRef);
    if (!roleSnap.val()) {
      await set(roleRef, 'viewer');
    }
  },

  async signIn(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await this.ensureUserProfile(credential.user);
    return credential;
  },

  async signUp(email, password) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await this.ensureUserProfile(credential.user);
    return credential;
  },

  async signOut() {
    return signOut(auth);
  },

  getCurrentUser() {
    return auth.currentUser;
  },

  subscribeLatest(callback, onError) {
    const latestRef = ref(db, withDevicePath('latest'));
    const handler = (snapshot) => callback(snapshot.val() || null);
    onValue(latestRef, handler, (err) => {
      console.error('[Firebase] latest error:', err);
      if (onError) onError(err);
    });
    return () => off(latestRef, 'value', handler);
  },

  subscribeHistory(dateKey, callback, onError) {
    const historyRef = ref(db, withDevicePath(`history/${dateKey}`));
    const handler = (snapshot) => callback(snapshot.val() || {});
    onValue(historyRef, handler, (err) => {
      if (onError) onError(err);
    });
    return () => off(historyRef, 'value', handler);
  },

  subscribeConfig(callback, onError) {
    const configRef = ref(db, withDevicePath('config'));
    const handler = (snapshot) => {
      const value = snapshot.val();
      if (value) callback(value);
    };
    onValue(configRef, handler, (err) => {
      if (onError) onError(err);
    });
    return () => off(configRef, 'value', handler);
  },

  subscribeRole(uid, callback) {
    if (!uid) return () => {};
    const roleRef = ref(db, `roles/${uid}`);
    const handler = (snapshot) => {
      const value = snapshot.val();
      callback(typeof value === 'string' ? value : value?.role || 'viewer');
    };
    onValue(roleRef, handler);
    return () => off(roleRef, 'value', handler);
  },

  async saveConfig(config) {
    if (!config) return;
    await set(ref(db, withDevicePath('config')), { ...config, updatedAt: Date.now() });
  },

  async getLatestSensorData() {
    const snapshot = await get(ref(db, withDevicePath('latest')));
    return snapshot.val() || null;
  },

  async getSensorHistory(limit = 30) {
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const q = query(
        ref(db, withDevicePath(`history/${today}`)),
        orderByChild('ts'),
        limitToLast(limit),
      );
      const snapshot = await get(q);
      const val = snapshot.val();
      if (!val) return [];
      return Object.values(val)
        .sort((a, b) => (b.ts || 0) - (a.ts || 0)); // newest first
    } catch {
      return [];
    }
  },

  /** One-shot fetch of all entries for a given YYYY-MM-DD date (no limit) */
  async getHistoryForDate(dateKey) {
    try {
      const snapshot = await get(ref(db, withDevicePath(`history/${dateKey}`)));
      return snapshot.val() || null;
    } catch (e) {
      console.warn('[Firebase] getHistoryForDate', dateKey, e.message);
      return null;
    }
  },

  /* ─── Deployed thresholds (from Firebase device config) ─── */
  subscribeDeployedConfig(callback) {
    const configRef = ref(db, withDevicePath('config'));
    const handler = (snapshot) => {
      const val = snapshot.val();
      if (val) callback(val);
    };
    onValue(configRef, handler);
    return () => off(configRef, 'value', handler);
  },

  /* ─── Custom presets (persisted in AsyncStorage) ─── */
  async loadCustomPresets() {
    try {
      const raw = await AsyncStorage.getItem('iot_custom_presets');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(p => ({ ...p, isCustom: true })) : [];
    } catch { return []; }
  },

  async saveCustomPresets(presets) {
    try {
      await AsyncStorage.setItem('iot_custom_presets', JSON.stringify(presets));
    } catch (e) { console.warn('saveCustomPresets', e.message); }
  },

  /* ─── Draft thresholds (persisted in AsyncStorage) ─── */
  async loadDraftThresholds(defaults) {
    try {
      const raw = await AsyncStorage.getItem('iot_draft_thresholds');
      return raw ? JSON.parse(raw) : { ...defaults };
    } catch { return { ...defaults }; }
  },

  async saveDraftThresholds(thresholds) {
    try {
      await AsyncStorage.setItem('iot_draft_thresholds', JSON.stringify(thresholds));
    } catch (e) { console.warn('saveDraftThresholds', e.message); }
  },
};
