import React from 'react';

function AdminPage({ users, roles, onSetRole, authUser }) {
  const entries = Object.entries(users || {}).map(([uid, profile]) => ({
    uid,
    email: profile.email || '--',
    role: roles?.[uid] || 'viewer',
  }));

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2>Quản trị tài khoản</h2>
          <p>Quản lý quyền truy cập hệ thống.</p>
        </div>
      </div>

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
                  Chưa có tài khoản nào.
                </td>
              </tr>
            ) : (
              entries.map((row) => {
                const isSelf = authUser?.uid === row.uid;
                return (
                  <tr key={row.uid}>
                    <td>{row.email}</td>
                    <td className="mono">{row.uid}</td>
                    <td>
                      <span className={`role-pill ${row.role}`}>{row.role}</span>
                    </td>
                    <td>
                      <button
                        className="btn-ghost"
                        onClick={() => onSetRole(row.uid, 'viewer')}
                        disabled={isSelf || row.role === 'viewer'}
                      >
                        Viewer
                      </button>
                      <button
                        className="btn-ghost"
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
