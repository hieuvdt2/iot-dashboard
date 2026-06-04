import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  off,
  set,
  remove,
  get,
} from 'firebase/database';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  setPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyCR5BxrCoh0n88EcYKbN0rZe1j5Eq3GUtY',
  authDomain:
    process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ||
    'smart-garden-eace0.firebaseapp.com',
  databaseURL:
    process.env.REACT_APP_FIREBASE_DB_URL ||
    'https://smart-garden-eace0-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'smart-garden-eace0',
  storageBucket:
    process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ||
    'smart-garden-eace0.firebasestorage.app',
  messagingSenderId:
    process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '150795132598',
  appId:
    process.env.REACT_APP_FIREBASE_APP_ID ||
    '1:150795132598:web:8a85b66faa8892de845017',
};

const DEVICE_ID = process.env.REACT_APP_DEVICE_ID || 'esp32_01';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/** Lưu phiên đăng nhập trong trình duyệt (localStorage/IndexedDB) — không mất khi reload tab */
function createAuth() {
  try {
    return initializeAuth(app, { persistence: browserLocalPersistence });
  } catch (e) {
    if (e?.code === 'auth/already-initialized') {
      const existing = getAuth(app);
      setPersistence(existing, browserLocalPersistence).catch(() => {});
      return existing;
    }
    throw e;
  }
}

const auth = createAuth();

console.log('[Firebase] Auth persistence: local (giữ đăng nhập sau khi reload)');

const withDevicePath = (path) => `devices/${DEVICE_ID}/${path}`;

/** Ghi hồ sơ vào RTDB nếu thiếu (đăng nhập cũ / tạo tay trên Console). */
async function ensureUserProfile(user) {
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
  if (!roleSnap.exists()) {
    await set(roleRef, 'viewer');
  }
}

/** Gộp users + roles để admin thấy cả tài khoản chỉ có quyền trong roles. */
export function mergeUserEntries(users = {}, roles = {}) {
  const uids = new Set([
    ...Object.keys(users || {}),
    ...Object.keys(roles || {}),
  ]);
  return [...uids].map((uid) => {
    const profile = users?.[uid];
    const rawRole = roles?.[uid];
    const role =
      typeof rawRole === 'string'
        ? rawRole
        : rawRole?.role || 'viewer';
    return {
      uid,
      email: profile?.email || rawRole?.email || '',
      role,
      hasProfile: Boolean(profile?.email || profile?.createdAt),
    };
  }).sort((a, b) => (a.email || a.uid).localeCompare(b.email || b.uid));
}

export const firebaseService = {
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  async signIn(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserProfile(credential.user);
    return credential;
  },

  async signUp(email, password) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserProfile(credential.user);
    return credential;
  },

  async ensureUserProfile(user) {
    return ensureUserProfile(user);
  },

  async signOut() {
    return signOut(auth);
  },

  subscribeLatest(callback, onError) {
    const latestRef = ref(db, withDevicePath('latest'));
    const handler = (snapshot) => {
      const value = snapshot.val();
      callback(value || null);
    };
    onValue(latestRef, handler, (err) => {
      console.error('[Firebase] Subscribe latest error:', err);
      if (onError) onError(err);
    });
    return () => off(latestRef, 'value', handler);
  },

  /** One-shot fetch for multiple YYYY-MM-DD date keys — returns raw entries sorted by ts */
  async getHistoryForDates(dateKeys) {
    const allEntries = [];
    await Promise.all(
      dateKeys.map(async (dateKey) => {
        try {
          const snapshot = await get(ref(db, withDevicePath(`history/${dateKey}`)));
          const val = snapshot.val();
          if (val) {
            Object.values(val).forEach((raw) => {
              if (raw && (raw.ts || raw.timestamp)) allEntries.push(raw);
            });
          }
        } catch (e) {
          console.warn('[Firebase] getHistoryForDates', dateKey, e.message);
        }
      })
    );
    return allEntries.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  },

  subscribeHistory(dateKey, callback, onError) {
    const historyRef = ref(db, withDevicePath(`history/${dateKey}`));
    const handler = (snapshot) => {
      callback(snapshot.val() || {});
    };
    onValue(historyRef, handler, (err) => {
      console.error('[Firebase] Subscribe history error:', err);
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
      console.error('[Firebase] Subscribe config error:', err);
      if (onError) onError(err);
    });
    return () => off(configRef, 'value', handler);
  },

  subscribeRole(uid, callback) {
    if (!uid) return () => {};
    const roleRef = ref(db, `roles/${uid}`);
    const handler = (snapshot) => {
      const value = snapshot.val();
      if (!value) {
        callback('viewer');
        return;
      }
      if (typeof value === 'string') {
        callback(value);
      } else {
        callback(value.role || 'viewer');
      }
    };
    onValue(roleRef, handler);
    return () => off(roleRef, 'value', handler);
  },

  subscribeRoles(callback, onError) {
    const rolesRef = ref(db, 'roles');
    const handler = (snapshot) => {
      callback(snapshot.val() || {});
    };
    onValue(rolesRef, handler, (err) => {
      console.error('[Firebase] subscribeRoles:', err);
      if (onError) onError(err);
    });
    return () => off(rolesRef, 'value', handler);
  },

  subscribeUsers(callback, onError) {
    const usersRef = ref(db, 'users');
    const handler = (snapshot) => {
      callback(snapshot.val() || {});
    };
    onValue(usersRef, handler, (err) => {
      console.error('[Firebase] subscribeUsers:', err);
      if (onError) onError(err);
    });
    return () => off(usersRef, 'value', handler);
  },

  async setUserRole(uid, nextRole) {
    const roleRef = ref(db, `roles/${uid}`);
    await set(roleRef, nextRole);
  },

  subscribePresets(callback, onError) {
    const presetsRef = ref(db, withDevicePath('presets'));
    const handler = (snapshot) => {
      callback(snapshot.val() || {});
    };
    onValue(presetsRef, handler, (err) => {
      console.error('[Firebase] Subscribe presets error:', err);
      if (onError) onError(err);
    });
    return () => off(presetsRef, 'value', handler);
  },

  async savePreset(key, preset) {
    if (!key) return;
    const presetRef = ref(db, withDevicePath(`presets/${key}`));
    await set(presetRef, { ...preset, updatedAt: Date.now() });
  },

  async saveConfig(config) {
    if (!config) return;
    const configRef = ref(db, withDevicePath('config'));
    await set(configRef, { ...config, updatedAt: Date.now() });
  },

  async deletePreset(key) {
    if (!key) return;
    const presetRef = ref(db, withDevicePath(`presets/${key}`));
    await remove(presetRef);
  },
};
