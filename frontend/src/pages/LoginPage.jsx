import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ credential: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEmail = form.credential.includes('@');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = isEmail
        ? { email: form.credential, password: form.password }
        : { phone: form.credential, password: form.password };
      const res = await api.post('/auth/login', payload);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.logo}>Pangugal</h1>
        <p style={S.sub}>Split expenses with friends</p>
        <form onSubmit={handleSubmit} style={S.form}>
          <input
            style={S.input}
            placeholder="Email or Phone"
            value={form.credential}
            onChange={e => setForm(f => ({ ...f, credential: e.target.value }))}
            required
          />
          <input
            style={S.input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
          />
          {error && <p style={S.error}>{error}</p>}
          <button style={S.btn} disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <p style={S.link}>Don't have an account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  card: { background: '#fff', borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' },
  logo: { fontSize: 32, fontWeight: 800, color: '#667eea', textAlign: 'center', marginBottom: 4 },
  sub: { textAlign: 'center', color: '#888', marginBottom: 28, fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '12px 14px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, outline: 'none' },
  error: { color: '#e53e3e', fontSize: 13 },
  btn: { padding: '13px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  link: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' },
};
