import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const qc = useQueryClient();

  const [name, setName] = useState(user?.name || '');
  const [profileMsg, setProfileMsg] = useState('');

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');

  const updateProfile = useMutation({
    mutationFn: () => api.put('/auth/profile', { name }),
    onSuccess: res => {
      const token = localStorage.getItem('pangugal_token');
      login(token, res.data.user);
      setProfileMsg('Name updated successfully!');
      setTimeout(() => setProfileMsg(''), 3000);
    },
    onError: err => setProfileMsg(err.response?.data?.message || 'Failed to update'),
  });

  const changePassword = useMutation({
    mutationFn: () => api.put('/auth/password', { currentPassword: passwords.current, newPassword: passwords.newPass }),
    onSuccess: () => {
      setPassMsg('Password changed successfully!');
      setPassErr('');
      setPasswords({ current: '', newPass: '', confirm: '' });
      setTimeout(() => setPassMsg(''), 3000);
    },
    onError: err => { setPassErr(err.response?.data?.message || 'Failed'); setPassMsg(''); },
  });

  function handlePasswordSubmit(e) {
    e.preventDefault();
    setPassErr(''); setPassMsg('');
    if (passwords.newPass !== passwords.confirm) return setPassErr('New passwords do not match');
    if (passwords.newPass.length < 6) return setPassErr('Password must be at least 6 characters');
    changePassword.mutate();
  }

  return (
    <div>
      <Navbar />
      <div style={S.page}>
        <h2 style={S.pageTitle}>My Profile</h2>

        {/* Avatar */}
        <div style={S.avatarWrap}>
          <div style={S.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <p style={S.userName}>{user?.name}</p>
            <p style={S.userSub}>{user?.email || user?.phone}</p>
          </div>
        </div>

        {/* Edit Name */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>Edit Name</h3>
          <div style={S.row}>
            <input
              style={S.input}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
            />
            <button
              style={S.btn}
              onClick={() => updateProfile.mutate()}
              disabled={updateProfile.isPending || !name.trim() || name === user?.name}
            >
              {updateProfile.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
          {profileMsg && <p style={S.success}>{profileMsg}</p>}
        </div>

        {/* Account Info (read-only) */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>Account Info</h3>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>Email</span>
            <span style={S.infoValue}>{user?.email || '—'}</span>
          </div>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>Phone</span>
            <span style={S.infoValue}>{user?.phone || '—'}</span>
          </div>
        </div>

        {/* Change Password */}
        <div style={S.card}>
          <h3 style={S.cardTitle}>Change Password</h3>
          <form onSubmit={handlePasswordSubmit} style={S.form}>
            <input
              style={S.input}
              type="password"
              placeholder="Current password"
              value={passwords.current}
              onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
              required
            />
            <input
              style={S.input}
              type="password"
              placeholder="New password (min 6 chars)"
              value={passwords.newPass}
              onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
              required
            />
            <input
              style={S.input}
              type="password"
              placeholder="Confirm new password"
              value={passwords.confirm}
              onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
              required
            />
            {passErr && <p style={S.error}>{passErr}</p>}
            {passMsg && <p style={S.success}>{passMsg}</p>}
            <button style={S.btn} type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}

const S = {
  page: { maxWidth: 560, margin: '0 auto', padding: '28px 16px' },
  pageTitle: { fontSize: 22, fontWeight: 800, marginBottom: 24 },
  avatarWrap: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  avatar: { width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, flexShrink: 0 },
  userName: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  userSub: { fontSize: 13, color: '#888' },
  card: { background: '#fff', borderRadius: 14, padding: '22px 24px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#333' },
  row: { display: 'flex', gap: 10 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { flex: 1, padding: '11px 13px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, outline: 'none' },
  btn: { padding: '11px 20px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' },
  infoLabel: { fontSize: 13, color: '#888' },
  infoValue: { fontSize: 14, fontWeight: 500 },
  success: { color: '#38a169', fontSize: 13, marginTop: 4 },
  error: { color: '#e53e3e', fontSize: 13 },
};
