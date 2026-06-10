import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AddExpenseModal from '../components/AddExpenseModal';
import EditExpenseModal from '../components/EditExpenseModal';
import InviteMemberModal from '../components/InviteMemberModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const CATEGORY_EMOJI = { food: '🍔', travel: '✈️', utilities: '💡', rent: '🏠', entertainment: '🎬', shopping: '🛍️', other: '💸' };

export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [activeTab, setActiveTab] = useState('expenses');

  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.get(`/groups/${groupId}`).then(r => r.data),
  });

  const { data: expensesData } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => api.get(`/groups/${groupId}/expenses`).then(r => r.data),
  });

  const { data: dashData } = useQuery({
    queryKey: ['groupDashboard', groupId],
    queryFn: () => api.get(`/dashboard/groups/${groupId}`).then(r => r.data),
  });

  async function openEdit(exp) {
    // fetch splits to pre-check the right members
    const res = await api.get(`/groups/${groupId}/expenses/${exp._id}`);
    const splitUserIds = res.data.splits.map(s => s.owedByUserId._id);
    setEditingExpense({ ...exp, existingSplitUserIds: splitUserIds });
  }

  const settleUp = useMutation({
    mutationFn: ({ owedByUserId }) => api.post(`/dashboard/groups/${groupId}/settle`, { owedByUserId }),
    onSuccess: () => { qc.invalidateQueries(['groupDashboard', groupId]); qc.invalidateQueries(['summary']); },
  });

  const deleteExpense = useMutation({
    mutationFn: expenseId => api.delete(`/groups/${groupId}/expenses/${expenseId}`),
    onSuccess: () => { qc.invalidateQueries(['expenses', groupId]); qc.invalidateQueries(['groupDashboard', groupId]); qc.invalidateQueries(['summary']); },
  });

  if (groupLoading) return <div><Navbar /><div style={S.loading}>Loading...</div></div>;
  if (!groupData) return <div><Navbar /><div style={S.loading}>Group not found</div></div>;

  const { group, members } = groupData;
  const expenses = expensesData?.expenses || [];
  const balances = dashData?.balances || [];
  const simplified = dashData?.simplifiedTransactions || [];

  return (
    <div>
      <Navbar />
      <div style={S.page}>
        {/* Header */}
        <div style={S.header}>
          <button style={S.back} onClick={() => navigate('/')}>← Back</button>
          <div style={S.headerInfo}>
            <h1 style={S.groupName}>{group.name}</h1>
            {group.description && <p style={S.groupDesc}>{group.description}</p>}
          </div>
          <div style={S.headerActions}>
            <button style={S.inviteBtn} onClick={() => setShowInvite(true)}>+ Invite</button>
            <button style={S.addBtn} onClick={() => setShowAddExpense(true)}>+ Add Expense</button>
          </div>
        </div>

        {/* Members strip */}
        <div style={S.membersStrip}>
          {members.map(m => (
            <div key={m._id} style={S.memberChip}>
              <div style={S.avatar}>{m.userId.name[0].toUpperCase()}</div>
              <span style={S.memberChipName}>{m.userId.name}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {['expenses', 'balances', 'simplified'].map(t => (
            <button key={t} style={{ ...S.tab, ...(activeTab === t ? S.activeTab : {}) }} onClick={() => setActiveTab(t)}>
              {t === 'expenses' ? 'Expenses' : t === 'balances' ? 'Balances' : 'Simplify Debts'}
            </button>
          ))}
        </div>

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div style={S.list}>
            {expenses.length === 0 && <p style={S.empty}>No expenses yet. Add one!</p>}
            {expenses.map(exp => (
              <div key={exp._id} style={S.expenseCard}>
                <div style={S.catEmoji}>{CATEGORY_EMOJI[exp.category] || '💸'}</div>
                <div style={S.expBody}>
                  <p style={S.expDesc}>{exp.description}</p>
                  <p style={S.expMeta}>
                    Paid by <strong>{exp.paidByUserId?.name}</strong> · {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    <span style={S.catBadge}>{exp.category}</span>
                  </p>
                </div>
                <div style={S.expRight}>
                  <span style={S.expAmount}>₹{(exp.totalAmountPaisa / 100).toFixed(2)}</span>
                  {exp.createdBy === user?._id && (
                    <div style={S.expActions}>
                      <button style={S.editBtn} onClick={() => openEdit(exp)}>✎</button>
                      <button style={S.delBtn} onClick={() => { if (window.confirm('Delete this expense?')) deleteExpense.mutate(exp._id); }}>✕</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <div style={S.list}>
            {dashData?.totalGroupExpense !== undefined && (
              <div style={S.totalBanner}>
                <span style={S.totalLabel}>Total Group Expenses</span>
                <span style={S.totalAmount}>₹{(dashData.totalGroupExpense || 0).toFixed(2)}</span>
              </div>
            )}
            {balances.length === 0 && <p style={S.empty}>Everyone is settled up!</p>}
            {balances.map((b, i) => {
              const spendPaisa = dashData?.spendMap?.[b.user?._id] || 0;
              const spendRupees = (spendPaisa / 100).toFixed(2);
              return (
                <div key={i} style={S.balCard}>
                  <div style={S.avatar}>{b.user?.name?.[0]?.toUpperCase()}</div>
                  <div style={S.balBody}>
                    <span style={S.balName}>{b.user?.name}</span>
                    <span style={S.balShare}>Individual share: ₹{spendRupees}</span>
                  </div>
                  <span style={{ ...S.balAmount, color: b.netAmount >= 0 ? '#38a169' : '#e53e3e' }}>
                    {b.netAmount >= 0 ? `gets back ₹${b.netAmount.toFixed(2)}` : `owes ₹${Math.abs(b.netAmount).toFixed(2)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Simplified Tab */}
        {activeTab === 'simplified' && (
          <div style={S.list}>
            {simplified.length === 0 && <p style={S.empty}>No debts to settle!</p>}
            {simplified.map((t, i) => {
              const isMe = t.from?._id === user?._id;
              return (
                <div key={i} style={S.simplCard}>
                  <div style={S.simplText}>
                    <strong>{t.from?.name}</strong> owes <strong>{t.to?.name}</strong>
                    <span style={S.simplAmount}> ₹{t.amount.toFixed(2)}</span>
                  </div>
                  {isMe && (
                    <button style={S.settleBtn} onClick={() => settleUp.mutate({ owedByUserId: t.from._id })}>
                      Mark Settled
                    </button>
                  )}
                </div>
              );
            })}
            {simplified.length > 0 && (
              <p style={S.simplNote}>These are optimized transactions — settling these clears all debts in this group.</p>
            )}
          </div>
        )}
      </div>

      <Footer />

      {showAddExpense && <AddExpenseModal groupId={groupId} members={members} onClose={() => setShowAddExpense(false)} />}
      {showInvite && <InviteMemberModal groupId={groupId} onClose={() => setShowInvite(false)} />}
      {editingExpense && <EditExpenseModal groupId={groupId} members={members} expense={editingExpense} onClose={() => setEditingExpense(null)} />}
    </div>
  );
}

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '24px 16px' },
  loading: { textAlign: 'center', padding: 60, color: '#aaa' },
  header: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  back: { background: 'none', border: 'none', cursor: 'pointer', color: '#667eea', fontSize: 15, fontWeight: 500, padding: '4px 0', whiteSpace: 'nowrap' },
  headerInfo: { flex: 1 },
  groupName: { fontSize: 24, fontWeight: 800 },
  groupDesc: { fontSize: 14, color: '#888', marginTop: 2 },
  headerActions: { display: 'flex', gap: 10 },
  inviteBtn: { padding: '8px 16px', border: '1.5px solid #667eea', color: '#667eea', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  addBtn: { padding: '8px 16px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  membersStrip: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  memberChip: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 20, padding: '6px 14px 6px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 },
  memberChipName: { fontSize: 13, fontWeight: 500 },
  tabs: { display: 'flex', gap: 0, background: '#fff', borderRadius: 10, padding: 4, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  tab: { flex: 1, padding: '9px 0', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#888', borderRadius: 8, fontWeight: 500 },
  activeTab: { background: '#667eea', color: '#fff', fontWeight: 700 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  empty: { color: '#aaa', textAlign: 'center', padding: '40px 0' },
  expenseCard: { background: '#fff', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  catEmoji: { fontSize: 26, width: 40, textAlign: 'center' },
  expBody: { flex: 1 },
  expDesc: { fontSize: 15, fontWeight: 600 },
  expMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  catBadge: { marginLeft: 8, background: '#f0f0ff', color: '#667eea', padding: '1px 8px', borderRadius: 10, fontSize: 11 },
  expRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  expAmount: { fontSize: 17, fontWeight: 700, color: '#1a1a2e' },
  expActions: { display: 'flex', gap: 6, alignItems: 'center' },
  editBtn: { background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 15, padding: '2px 4px' },
  delBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 13 },
  balCard: { background: '#fff', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  balBody: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  balName: { fontSize: 15, fontWeight: 600 },
  balShare: { fontSize: 12, color: '#888' },
  balAmount: { fontSize: 15, fontWeight: 700 },
  simplCard: { background: '#fff', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  simplText: { fontSize: 15, color: '#333' },
  simplAmount: { color: '#e53e3e', fontWeight: 700 },
  settleBtn: { padding: '7px 14px', background: '#38a169', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  simplNote: { fontSize: 12, color: '#aaa', textAlign: 'center', padding: '8px 0' },
  totalBanner: { background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 },
  totalAmount: { fontSize: 24, fontWeight: 800, color: '#fff' },
};
