import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.email && !form.phone) return setError('Email or phone is required');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
      });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h1 style={S.logo}>Pangugal</h1>
        <p style={S.sub}>Create your account</p>
        <form onSubmit={handleSubmit} style={S.form}>
          <input style={S.input} placeholder="Full Name *" value={form.name} onChange={set('name')} required />
          <input style={S.input} placeholder="Email" type="email" value={form.email} onChange={set('email')} />
          <input style={S.input} placeholder="Phone (e.g. +919876543210)" value={form.phone} onChange={set('phone')} />
          <input style={S.input} placeholder="Password *" type="password" value={form.password} onChange={set('password')} required minLength={6} />
          <p style={S.hint}>Enter at least one of email or phone</p>
          {error && <p style={S.error}>{error}</p>}
          <button style={S.btn} disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
        </form>
        <p style={S.link}>Already have an account? <Link to="/login">Login</Link></p>
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
  hint: { fontSize: 12, color: '#aaa', marginTop: -4 },
  error: { color: '#e53e3e', fontSize: 13 },
  btn: { padding: '13px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  link: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' },
};
