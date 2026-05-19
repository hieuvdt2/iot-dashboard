import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function LoginPage({ onSignIn, authError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password || submitting) return;
    setSubmitting(true);
    try {
      await onSignIn(email, password);
      navigate('/');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <h2>Đăng nhập</h2>
        <p>Đăng nhập để xem và quản trị hệ thống Smart Garden.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn-save" type="submit" disabled={submitting}>
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        {authError && <div className="auth-error">{authError}</div>}
        <div className="auth-footer">
          Chưa có tài khoản? <Link to="/dang-ky">Đăng ký</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
