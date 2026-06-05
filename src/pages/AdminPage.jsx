import React, { useMemo, useState } from 'react';
import { mergeUserEntries } from '../shared/services/firebaseService';
import { syncUsersFromFirebaseAuth } from '../shared/services/adminService';

function AdminPage({
  users,
  roles,
  onSetRole,
  authUser,
  adminDbError,
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const entries = useMemo(
    () => mergeUserEntries(users, roles),
    [users, roles],
  );

  const apiConfigured = Boolean(process.env.REACT_APP_API_URL);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError('');
    try {
      await syncUsersFromFirebaseAuth();
    } catch (err) {
      setSyncError(err.message || 'Không thể đồng bộ.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2>Quản trị tài khoản</h2>
          <p>Phân quyền viewer hoặc admin cho người dùng trong hệ thống.</p>
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

      {adminDbError && (
        <div className="auth-error" style={{ marginBottom: 12 }}>
          Không đọc được danh sách người dùng. Kiểm tra quyền admin và Firebase Rules.
        </div>
      )}

      {syncError && (
        <div className="auth-error" style={{ marginBottom: 12 }}>
          {syncError}
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Quyền</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="no-data">
                  Chưa có người dùng. Đăng nhập lại hoặc bấm đồng bộ từ Firebase Auth.
                </td>
              </tr>
            ) : (
              entries.map((row) => {
                const isSelf = authUser?.uid === row.uid;
                const emailDisplay = row.email || (row.hasProfile ? '—' : '(chưa có email)');
                return (
                  <tr key={row.uid}>
                    <td>{emailDisplay}</td>
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
