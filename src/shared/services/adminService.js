const API_URL = process.env.REACT_APP_API_URL || '';

/** Kiểm tra server Render có API mới và Firebase Admin hoạt động không. */
export async function checkApiHealth() {
  const base = API_URL.replace(/\/$/, '');
  if (!base) {
    return { ok: false, error: 'Chưa cấu hình REACT_APP_API_URL trong .env (web).' };
  }
  try {
    const res = await fetch(`${base}/api/health`, { method: 'GET' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    if (data.message && !data.routes) {
      return {
        ok: false,
        error: 'Server đang chạy bản cũ (chưa có /api/health). Cần redeploy thư mục server/ trên Render.',
      };
    }
    if (!data.firebase) {
      return {
        ok: false,
        error: data.firebaseError || 'Firebase Admin trên server chưa kết nối. Thêm FIREBASE_SERVICE_ACCOUNT_JSON trên Render.',
        detail: data,
      };
    }
    return { ok: true, detail: data };
  } catch (e) {
    return { ok: false, error: e.message || 'Không gọi được server (Render sleep hoặc URL sai).' };
  }
}

/** Đồng bộ toàn bộ user Firebase Auth → Realtime Database (cần server + Admin SDK). */
export async function syncUsersFromFirebaseAuth() {
  const base = API_URL.replace(/\/$/, '');
  if (!base) {
    throw new Error('Chưa cấu hình REACT_APP_API_URL (server Node).');
  }

  const health = await checkApiHealth();
  if (!health.ok) {
    throw new Error(health.error);
  }

  const res = await fetch(`${base}/api/admin/sync-users`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (res.status === 404) {
    throw new Error(
      'Server chưa có API đồng bộ (404). Deploy lại thư mục server/ trên Render, rồi thử GET /api/health.',
    );
  }
  if (res.status === 405) {
    throw new Error(data.error || 'API chỉ nhận POST, không mở link trực tiếp trên trình duyệt.');
  }
  if (res.status === 503) {
    throw new Error(data.error || 'Firebase Admin trên server chưa sẵn sàng — kiểm tra service account trên Render.');
  }
  if (!res.ok) {
    throw new Error(data.error || `Lỗi đồng bộ (${res.status})`);
  }
  if (data.message && !data.ok) {
    throw new Error(
      'Server trả về bản cũ (chưa có route sync). Redeploy Render với code mới nhất.',
    );
  }
  return data;
}
