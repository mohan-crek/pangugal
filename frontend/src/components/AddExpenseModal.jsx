import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['food', 'travel', 'utilities', 'rent', 'entertainment', 'shopping', 'other'];

export default function AddExpenseModal({ groupId, members, onClose }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ description: '', category: 'food', amount: '' });
  const [splitAmong, setSplitAmong] = useState(members.map(m => m.userId._id));
  const [error, setError] = useState('');

  const addExpense = useMutation({
    mutationFn: data => api.post(`/groups/${groupId}/expenses`, data),
    onSuccess: () => {
      qc.invalidateQueries(['expenses', groupId]);
      qc.invalidateQueries(['groupDashboard', groupId]);
      qc.invalidateQueries(['summary']);
      onClose();
    },
    onError: err => setError(err.response?.data?.message || 'Failed to add expense'),
  });

  function toggleMember(uid) {
    setSplitAmong(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (splitAmong.length === 0) return setError('Select at least one person to split with');
    addExpense.mutate({ description: form.description, category: form.category, totalAmount: form.amount, splitAmong });
  }

  const perPerson = splitAmong.length > 0 && form.amount
    ? (parseFloat(form.amount) / splitAmong.length).toFixed(2)
    : null;

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <h3 style={S.title}>Add Expense</h3>
        <form onSubmit={handleSubmit} style={S.form}>
          <input style={S.input} placeholder="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
          <div style={S.row}>
            <select style={S.select} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <input style={{ ...S.input, flex: 1 }} placeholder="Amount (₹) *" type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>

          <div style={S.splitSection}>
            <p style={S.splitLabel}>Split among: {perPerson && <span style={S.perPerson}>₹{perPerson} each</span>}</p>
            <div style={S.memberList}>
              {members.map(m => {
                const uid = m.userId._id;
                const checked = splitAmong.includes(uid);
                const isMe = uid === user?._id;
                return (
                  <label key={uid} style={{ ...S.memberItem, background: checked ? '#f0f0ff' : '#fafafa' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleMember(uid)} style={{ marginRight: 8 }} />
                    <span style={S.memberName}>{m.userId.name}{isMe ? ' (you)' : ''}</span>
                    {checked && perPerson && <span style={S.share}>₹{perPerson}</span>}
                  </label>
                );
              })}
            </div>
          </div>

          {error && <p style={S.error}>{error}</p>}
          <div style={S.actions}>
            <button type="button" style={S.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" style={S.submitBtn} disabled={addExpense.isPending}>
              {addExpense.isPending ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '11px 13px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, outline: 'none' },
  row: { display: 'flex', gap: 10 },
  select: { padding: '11px 13px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, outline: 'none', background: '#fff' },
  splitSection: { background: '#f9f9f9', borderRadius: 10, padding: 14 },
  splitLabel: { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 },
  perPerson: { color: '#667eea', fontWeight: 700, marginLeft: 6 },
  memberList: { display: 'flex', flexDirection: 'column', gap: 8 },
  memberItem: { display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid #e8e8e8' },
  memberName: { flex: 1, fontSize: 14 },
  share: { fontSize: 13, color: '#667eea', fontWeight: 600 },
  error: { color: '#e53e3e', fontSize: 13 },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  cancelBtn: { padding: '9px 18px', border: '1.5px solid #e0e0e0', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  submitBtn: { padding: '9px 18px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
};
