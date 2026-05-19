import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  off,
  set,
  remove,
} from 'firebase/database';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCR5BxrCoh0n88EcYKbN0rZe1j5Eq3GUtY',
  authDomain: 'smart-garden-eace0.firebaseapp.com',
  databaseURL:
    'https://smart-garden-eace0-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'smart-garden-eace0',
  storageBucket: 'smart-garden-eace0.firebasestorage.app',
  messagingSenderId: '150795132598',
  appId: '1:150795132598:web:8a85b66faa8892de845017',
};

const DEVICE_ID = 'esp32_01';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const withDevicePath = (path) => `devices/${DEVICE_ID}/${path}`;

export const firebaseService = {
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },

  async signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  },

  async signUp(email, password) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;
    const profileRef = ref(db, `users/${user.uid}`);
    await set(profileRef, {
      email: user.email,
      createdAt: Date.now(),
    });
    const roleRef = ref(db, `roles/${user.uid}`);
    await set(roleRef, 'viewer');
    return credential;
  },

  async signOut() {
    return signOut(auth);
  },

  subscribeLatest(callback) {
    const latestRef = ref(db, withDevicePath('latest'));
    const handler = (snapshot) => {
      const value = snapshot.val();
      if (value) callback(value);
    };
    onValue(latestRef, handler);
    return () => off(latestRef, 'value', handler);
  },

  subscribeHistory(dateKey, callback) {
    const historyRef = ref(db, withDevicePath(`history/${dateKey}`));
    const handler = (snapshot) => {
      callback(snapshot.val() || {});
    };
    onValue(historyRef, handler);
    return () => off(historyRef, 'value', handler);
  },

  subscribeConfig(callback) {
    const configRef = ref(db, withDevicePath('config'));
    const handler = (snapshot) => {
      const value = snapshot.val();
      if (value) callback(value);
    };
    onValue(configRef, handler);
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

  subscribeRoles(callback) {
    const rolesRef = ref(db, 'roles');
    const handler = (snapshot) => {
      callback(snapshot.val() || {});
    };
    onValue(rolesRef, handler);
    return () => off(rolesRef, 'value', handler);
  },

  subscribeUsers(callback) {
    const usersRef = ref(db, 'users');
    const handler = (snapshot) => {
      callback(snapshot.val() || {});
    };
    onValue(usersRef, handler);
    return () => off(usersRef, 'value', handler);
  },

  async setUserRole(uid, nextRole) {
    const roleRef = ref(db, `roles/${uid}`);
    await set(roleRef, nextRole);
  },

  subscribePresets(callback) {
    const presetsRef = ref(db, withDevicePath('presets'));
    const handler = (snapshot) => {
      callback(snapshot.val() || {});
    };
    onValue(presetsRef, handler);
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
