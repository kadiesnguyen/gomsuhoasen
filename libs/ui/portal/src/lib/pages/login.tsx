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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left — Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 48px', background: '#fff' }}>
        <div style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.15em', color: '#9A7520', marginBottom: 4 }}>GỐM HOA SEN</h1>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#191714', margin: 0 }}>Đăng nhập quản trị</h2>
            <p style={{ color: '#7A7570', marginTop: 8, fontSize: '0.95rem' }}>Quản lý sản phẩm, yêu cầu báo giá và nội dung showroom.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                placeholder="admin@gomhoasen.vn" autoComplete="username" required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 12, fontSize: '0.95rem', outline: 'none', background: '#fafaf8', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: 6 }}>Mật khẩu</label>
              <input
                type="password" value={password} onChange={e => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••" autoComplete="current-password" required
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 12, fontSize: '0.95rem', outline: 'none', background: '#fafaf8', boxSizing: 'border-box' }}
              />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 14px', fontSize: '0.85rem', color: '#b91c1c', marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', border: 'none', borderRadius: 12,
              background: loading ? '#ccc' : 'linear-gradient(135deg, #9A7520, #C4A550)', color: '#fff',
              fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
            }}>
              {loading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>

      {/* Right — Brand */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #9A7520, #6B5215)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 64px', color: '#fff' }} className="login-brand-panel">
        <h2 style={{ fontSize: '2.2rem', fontWeight: 700, lineHeight: 1.3, marginBottom: 32, maxWidth: 480 }}>
          Công cụ quản trị Gốm Hoa Sen
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            'Quản lý sản phẩm và trải nghiệm 3D',
            'Xử lý yêu cầu báo giá theo thời gian thực',
            'Theo dõi hiệu quả vận hành',
            'Quản lý nghệ nhân và câu chuyện',
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '1.1rem' }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
