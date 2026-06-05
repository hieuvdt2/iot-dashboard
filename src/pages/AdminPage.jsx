import React, { useMemo, useState, useEffect } from 'react';
import { mergeUserEntries, firebaseService } from '../shared/services/firebaseService';
import { syncUsersFromFirebaseAuth, checkApiHealth } from '../shared/services/adminService';

const FB_CONSOLE = 'https://console.firebase.google.com/project/smart-garden-eace0';
const RTDB_DATA = `${FB_CONSOLE}/database/smart-garden-eace0-default-rtdb/data`;
const AUTH_USERS = `${FB_CONSOLE}/authentication/users`;

function AdminPage({
  users,
  roles,
  onSetRole,
  authUser,
  adminDbError,
  currentRole,
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [apiStatus, setApiStatus] = useState(null);
  const [profileMsg, setProfileMsg] = useState('');

  const entries = useMemo(
    () => mergeUserEntries(users, roles),
    [users, roles],
  );

  const apiConfigured = Boolean(process.env.REACT_APP_API_URL);

  useEffect(() => {
    if (!apiConfigured) {
      setApiStatus({ ok: false, error: 'REACT_APP_API_URL chưa được set khi build web.' });
      return;
    }
    checkApiHealth().then(setApiStatus);
  }, [apiConfigured]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const result = await syncUsersFromFirebaseAuth();
      setSyncMsg(`Đã đồng bộ ${result.count ?? 0} tài khoản từ Firebase Auth vào Realtime Database.`);
      await checkApiHealth().then(setApiStatus);
    } catch (err) {
      setSyncMsg(err.message || 'Không thể đồng bộ.');
    } finally {
      setSyncing(false);
    }
  };

  const handleEnsureMyProfile = async () => {
    setProfileMsg('');
    try {
      await firebaseService.ensureUserProfile(authUser);
      setProfileMsg('Đã ghi hồ sơ của bạn vào users/ và roles/ (nếu thiếu).');
    } catch (e) {
      setProfileMsg(e.message || 'Không ghi được — kiểm tra Rules Firebase.');
    }
  };

  const userCount = Object.keys(users || {}).length;
  const roleCount = Object.keys(roles || {}).length;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2>Quản trị tài khoản</h2>
          <p>
            Web đọc từ Realtime Database (<code>users/</code>, <code>roles/</code>), không đọc trực tiếp
            danh sách Authentication. Cần kiểm tra cả Firebase Console và Rules.
          </p>
        </div>
        {apiConfigured && (
          <button
            type="button"
            className="btn-save"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ từ Firebase Auth'}
          </button>
        )}
      </div>

      <div className="admin-checklist">
        <h3>Checklist trên Firebase Console</h3>
        <ol>
          <li>
            <strong>Authentication → Users</strong> — có email đăng ký chưa?{' '}
            <a href={AUTH_USERS} target="_blank" rel="noreferrer">Mở Auth</a>
          </li>
          <li>
            <strong>Realtime Database → Data</strong> — có nhánh <code>users</code> và <code>roles</code>?{' '}
            <a href={RTDB_DATA} target="_blank" rel="noreferrer">Mở Database</a>
          </li>
          <li>
            <strong>Admin đầu tiên</strong> — tạo tay: <code>roles/{'{uid}'}</code> = <code>&quot;admin&quot;</code>{' '}
            (uid copy từ Authentication hoặc bảng dưới khi đã có 1 dòng).
          </li>
          <li>
            <strong>Rules</strong> — admin phải được đọc cả cây <code>users</code> và <code>roles</code>.
            Dùng file <code>database.rules.json</code> trong repo (Publish Rules).
          </li>
          <li>
            <strong>Render</strong> — env <code>FIREBASE_SERVICE_ACCOUNT_JSON</code> = toàn bộ JSON service account;
            redeploy sau khi đổi code.
          </li>
        </ol>
        <p className="admin-checklist-note">
          Quyền hiện tại của bạn: <strong>{currentRole}</strong>
          {authUser?.uid && (
            <> · UID: <code className="mono">{authUser.uid}</code></>
          )}
        </p>
      </div>

      <div className="admin-stats">
        <span>users/: {userCount} bản ghi</span>
        <span>roles/: {roleCount} bản ghi</span>
        <span>Hiển thị bảng: {entries.length} dòng</span>
        <button type="button" className="btn-ghost" onClick={handleEnsureMyProfile}>
          Tạo/cập nhật hồ sơ của tôi
        </button>
      </div>

      {profileMsg && (
        <div className={`auth-error ${profileMsg.includes('Đã ghi') ? 'auth-success' : ''}`} style={{ marginBottom: 8 }}>
          {profileMsg}
        </div>
      )}

      {adminDbError && (
        <div className="auth-error" style={{ marginBottom: 8 }}>
          Lỗi đọc database: {adminDbError}
          <br />
          <small>
            Sửa: Firebase Console → Realtime Database → <strong>Rules</strong> → dán nội dung file{' '}
            <code>database.rules.json</code> trong repo → <strong>Publish</strong> → đăng nhập lại.
            Đảm bảo <code>roles/{'{uid}'}</code> = <code>&quot;admin&quot;</code> trong Data.
          </small>
        </div>
      )}

      {apiStatus && !apiStatus.ok && (
        <div className="auth-error" style={{ marginBottom: 8 }}>
          Server API: {apiStatus.error}
        </div>
      )}

      {apiStatus?.ok && (
        <div className="auth-success" style={{ marginBottom: 8, fontSize: '0.85rem' }}>
          Server API OK · Firebase Admin trên server đã kết nối.
        </div>
      )}

      {syncMsg && (
        <div className={`auth-error ${syncMsg.includes('Đã đồng bộ') ? 'auth-success' : ''}`} style={{ marginBottom: 12 }}>
          {syncMsg}
        </div>
      )}

      {!apiConfigured && (
        <p className="admin-hint">
          Web build thiếu <code>REACT_APP_API_URL=https://server-iot-0qml.onrender.com</code> — thêm vào .env rồi build lại.
          Hoặc chỉ dùng Firebase: đăng nhập lại + tạo <code>roles/uid</code> = admin trong Console.
        </p>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>UID</th>
              <th>Quyền</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="no-data">
                  Chưa có dữ liệu trong Realtime Database. Làm bước 2–3 trong checklist (hoặc bấm đồng bộ / đăng nhập lại).
                </td>
              </tr>
            ) : (
              entries.map((row) => {
                const isSelf = authUser?.uid === row.uid;
                const emailDisplay = row.email || (row.hasProfile ? '—' : '(chưa đồng bộ email)');
                return (
                  <tr key={row.uid}>
                    <td>{emailDisplay}</td>
                    <td className="mono">{row.uid}</td>
                    <td>
                      <span className={`role-pill ${row.role}`}>{row.role}</span>
                    </td>
                    <td>
                      <button
                        className="btn-ghost"
                        type="button"
                        onClick={() => onSetRole(row.uid, 'viewer')}
                        disabled={isSelf || row.role === 'viewer'}
                      >
                        Viewer
                      </button>
                      <button
                        className="btn-ghost"
                        type="button"
                        onClick={() => onSetRole(row.uid, 'admin')}
                        disabled={row.role === 'admin'}
                      >
                        Admin
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPage;
