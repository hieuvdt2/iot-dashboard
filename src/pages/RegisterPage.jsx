import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function RegisterPage({ onSignUp, authError, authUser, authLoading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && authUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [authUser, authLoading, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password || submitting) return;
    setSubmitting(true);
    try {
      await onSignUp(email, password);
      navigate('/dashboard', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <h2>Đăng ký</h2>
        <p>Tạo tài khoản mới để truy cập dashboard.</p>
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
            {submitting ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>
        {authError && <div className="auth-error">{authError}</div>}
        <div className="auth-footer">
          Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
