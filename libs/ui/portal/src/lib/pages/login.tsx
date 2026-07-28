// Refs read: v2/apps/v2-portal/src/pages/Login.tsx
// Kept: split layout (form left, brand right), form state, error handling
// Dropped: OAuth (Zalo/Google/Facebook), TOTP, i18n, invitation, signup link

import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { api } from '../services/api';
import { classifyApiError, mergeApiErrorMessage } from '../services/api-error';

export function LoginPage() {
  const { dispatch } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.login(email, password);
      dispatch({ type: 'LOGIN', payload: res });
      navigate('/admin/');
    } catch (err: unknown) {
      const classified = classifyApiError(err);
      setError(
        classified.statusCode === 401
          ? 'Email hoặc mật khẩu không đúng.'
          : mergeApiErrorMessage('Đăng nhập thất bại', classified),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: 20, background: 'var(--ghs-bg)', boxSizing: 'border-box' }}>
      {/* Left — Form */}
      <div className="ghs-card" style={{ width: 'min(100%, 440px)' }}>
        <div>
          <div style={{ marginBottom: 32 }}>
            <div className="ghs-brand-main" style={{ color: 'var(--ghs-primary)', marginBottom: 8 }}>GỐM HOA SEN</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ghs-text)', margin: 0 }}>Đăng nhập quản trị</h1>
            <p style={{ color: 'var(--ghs-text-muted)', marginTop: 8, fontSize: '0.95rem' }}>Quản lý sản phẩm, yêu cầu báo giá và nội dung showroom.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="ghs-label">Email</label>
              <input
                type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                placeholder="admin@gomhoasen.vn" autoComplete="username" required
                className="ghs-input"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="ghs-label">Mật khẩu</label>
              <input
                type="password" value={password} onChange={e => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••" autoComplete="current-password" required
                className="ghs-input"
              />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 14px', fontSize: '0.85rem', color: '#b91c1c', marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="ghs-btn ghs-btn-primary" style={{ width: '100%' }}>
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
