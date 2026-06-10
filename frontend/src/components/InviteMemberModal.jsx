import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export default function InviteMemberModal({ groupId, onClose }) {
  const qc = useQueryClient();
  const [credential, setCredential] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const invite = useMutation({
    mutationFn: data => api.post(`/groups/${groupId}/invite`, data),
    onSuccess: res => {
      qc.invalidateQueries(['group', groupId]);
      setSuccess(`${res.data.user.name} added to group!`);
      setCredential('');
    },
    onError: err => setError(err.response?.data?.message || 'Failed to invite'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const isEmail = credential.includes('@');
    invite.mutate(isEmail ? { email: credential } : { phone: credential });
  }

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <h3 style={S.title}>Invite Member</h3>
        <p style={S.hint}>Enter email or phone number of the person you want to add</p>
        <form onSubmit={handleSubmit} style={S.form}>
          <input style={S.input} placeholder="Email or Phone" value={credential} onChange={e => setCredential(e.target.value)} required />
          {error && <p style={S.error}>{error}</p>}
          {success && <p style={S.success}>{success}</p>}
          <div style={S.actions}>
            <button type="button" style={S.cancelBtn} onClick={onClose}>Close</button>
            <button type="submit" style={S.submitBtn} disabled={invite.isPending}>
              {invite.isPending ? 'Inviting...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  hint: { fontSize: 13, color: '#888', marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '11px 13px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, outline: 'none' },
  error: { color: '#e53e3e', fontSize: 13 },
  success: { color: '#38a169', fontSize: 13 },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  cancelBtn: { padding: '9px 18px', border: '1.5px solid #e0e0e0', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  submitBtn: { padding: '9px 18px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
};
