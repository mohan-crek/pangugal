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

export default function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterMember, setFilterMember] = useState(null); // userId or null = all
  const [filterCategory, setFilterCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('expenses');

  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.get(`/groups/${groupId}`).then(r => r.data),
  });

  const { data: expensesData } = useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => api.get(`/groups/${groupId}/expenses`).then(r => r.data),
    staleTime: 0,
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
  const allExpenses = expensesData?.expenses || [];
  const expenses = allExpenses
    .filter(e => !filterMember || e.paidByUserId?._id === filterMember)
    .filter(e => !filterCategory || e.category === filterCategory);
  const filterName = filterMember ? members.find(m => m.userId._id === filterMember)?.userId?.name : null;

  const CATEGORIES = ['food', 'travel', 'utilities', 'rent', 'entertainment', 'shopping', 'other'];
  const CATEGORY_EMOJI = { food: '🍔', travel: '✈️', utilities: '💡', rent: '🏠', entertainment: '🎬', shopping: '🛍️', other: '💸' };
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

        {/* Members strip — click to filter expenses */}
        <div style={S.membersStrip}>
          <div
            style={{ ...S.memberChip, ...(filterMember === null ? S.memberChipActive : {}) }}
            onClick={() => setFilterMember(null)}
          >
            <div style={{ ...S.avatar, background: filterMember === null ? '#667eea' : '#ccc' }}>All</div>
          </div>
          {members.map(m => {
            const active = filterMember === m.userId._id;
            return (
              <div
                key={m._id}
                style={{ ...S.memberChip, ...(active ? S.memberChipActive : {}) }}
                onClick={() => setFilterMember(active ? null : m.userId._id)}
              >
                <div style={{ ...S.avatar, background: active ? '#667eea' : 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                  {m.userId.name[0].toUpperCase()}
                </div>
                <span style={S.memberChipName}>{m.userId.name}</span>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={S.tabsRow}>
          <div style={S.tabs}>
            {['expenses', 'balances', 'simplified'].map(t => (
              <button key={t} style={{ ...S.tab, ...(activeTab === t ? S.activeTab : {}) }} onClick={() => setActiveTab(t)}>
                {t === 'expenses' ? 'Expenses' : t === 'balances' ? 'Balances' : 'Simplify Debts'}
              </button>
            ))}
          </div>
          {activeTab === 'expenses' && (
            <div style={S.countBadge}>
              <div style={S.countLeft}>
                <span style={S.countNum}>
                  {(filterMember || filterCategory) ? expenses.length : (dashData?.totalExpenseCount ?? allExpenses.length)}
                </span>
                <span style={S.countLabel}>
                  {(filterMember || filterCategory) ? 'filtered' : 'expenses'}
                </span>
                {(filterMember || filterCategory) && (
                  <span style={S.countTotal}> / {dashData?.totalExpenseCount ?? allExpenses.length}</span>
                )}
              </div>
              <div style={S.countDivider} />
              <div style={S.countRight}>
                <span style={S.countAmount}>
                  ₹{(
                    (filterMember || filterCategory)
                      ? expenses.reduce((t, e) => t + e.totalAmountPaisa, 0) / 100
                      : (dashData?.totalGroupExpense || 0)
                  ).toFixed(2)}
                </span>
                <span style={S.countLabel}>total</span>
              </div>
            </div>
          )}
        </div>

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div style={S.list}>
            {/* Category filter pills */}
            <div style={S.catFilter}>
              <button
                style={{ ...S.catPill, ...(filterCategory === null ? S.catPillActive : {}) }}
                onClick={() => setFilterCategory(null)}
              >All</button>
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  style={{ ...S.catPill, ...(filterCategory === c ? S.catPillActive : {}) }}
                  onClick={() => setFilterCategory(filterCategory === c ? null : c)}
                >
                  {CATEGORY_EMOJI[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>

            {filterName && (
              <div style={S.filterBanner}>
                Showing expenses paid by <strong>{filterName}</strong>
                <button style={S.clearFilter} onClick={() => setFilterMember(null)}>✕ Clear</button>
              </div>
            )}
            {expenses.length === 0 && (
              <p style={S.empty}>{filterName ? `No expenses paid by ${filterName}` : 'No expenses yet. Add one!'}</p>
            )}
            {expenses.map(exp => (
              <div key={exp._id} style={S.expenseCard}>
                <div style={S.catEmoji}>{CATEGORY_EMOJI[exp.category] || '💸'}</div>
                <div style={S.expBody}>
                  <p style={S.expDesc}>{exp.description}</p>
                  <p style={S.expMeta}>
                    Paid by <strong>{exp.paidByUserId?.name}</strong> · {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    <span style={S.catBadge}>{exp.category}</span>
                  </p>
                  {exp.sharedWith?.length > 0 && (
                    <p style={S.sharedWith}>
                      Shared with: {exp.sharedWith.map(u => u.name).join(', ')}
                    </p>
                  )}
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
            {simplified.length === 0 && <p style={S.empty}>🎉 Everyone is settled up!</p>}
            {simplified.map((t, i) => {
              const iAmDebtor = t.from?._id === user?._id;
              const iAmCreditor = t.to?._id === user?._id;
              const canSettle = iAmDebtor || iAmCreditor;
              return (
                <div key={i} style={S.simplCard}>
                  <div>
                    <div style={S.simplText}>
                      <strong style={{ color: iAmDebtor ? '#e53e3e' : '#333' }}>{t.from?.name}</strong>
                      <span style={S.simplArrow}> owes </span>
                      <strong style={{ color: iAmCreditor ? '#38a169' : '#333' }}>{t.to?.name}</strong>
                    </div>
                    <div style={S.simplAmount}>₹{t.amount.toFixed(2)}</div>
                    {iAmDebtor && <p style={S.simplHint}>You need to pay {t.to?.name}</p>}
                    {iAmCreditor && <p style={{ ...S.simplHint, color: '#38a169' }}>{t.from?.name} needs to pay you</p>}
                  </div>
                  {canSettle && (
                    <button
                      style={S.settleBtn}
                      onClick={() => {
                        if (window.confirm(`Mark ₹${t.amount.toFixed(2)} between ${t.from?.name} and ${t.to?.name} as settled?`)) {
                          settleUp.mutate({ owedByUserId: t.from?._id, owedToUserId: t.to?._id });
                        }
                      }}
                    >
                      ✓ Mark Settled
                    </button>
                  )}
                </div>
              );
            })}
            {simplified.length > 0 && (
              <p style={S.simplNote}>Optimized transactions — settling these clears all debts in this group.</p>
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
  memberChip: { display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 20, padding: '6px 14px 6px 8px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', cursor: 'pointer', transition: 'all 0.15s' },
  memberChipActive: { background: '#eef0ff', boxShadow: '0 0 0 2px #667eea' },
  avatar: { width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 },
  memberChipName: { fontSize: 13, fontWeight: 500 },
  tabsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  tabs: { display: 'flex', gap: 0, background: '#fff', borderRadius: 10, padding: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flex: 1 },
  countBadge: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 10, padding: '8px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', whiteSpace: 'nowrap' },
  countLeft: { display: 'flex', alignItems: 'baseline', gap: 4 },
  countRight: { display: 'flex', alignItems: 'baseline', gap: 4 },
  countDivider: { width: 1, height: 24, background: '#eee' },
  countNum: { fontSize: 18, fontWeight: 800, color: '#667eea' },
  countAmount: { fontSize: 16, fontWeight: 800, color: '#38a169' },
  countLabel: { fontSize: 11, color: '#aaa', fontWeight: 500 },
  countTotal: { fontSize: 11, color: '#ccc' },
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
  sharedWith: { fontSize: 12, color: '#999', marginTop: 4 },
  filterBanner: { background: '#eef0ff', border: '1px solid #c7d0ff', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#444', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  clearFilter: { background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
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
  simplCard: { background: '#fff', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  simplText: { fontSize: 15, color: '#333', marginBottom: 4 },
  simplArrow: { color: '#aaa' },
  simplAmount: { fontSize: 20, fontWeight: 800, color: '#e53e3e', marginBottom: 2 },
  simplHint: { fontSize: 12, color: '#888', marginTop: 2 },
  settleBtn: { padding: '9px 16px', background: '#38a169', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' },
  simplNote: { fontSize: 12, color: '#aaa', textAlign: 'center', padding: '8px 0' },
  catFilter: { display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 4 },
  catPill: { padding: '6px 12px', borderRadius: 20, border: '1.5px solid #e0e0e0', background: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500, color: '#555' },
  catPillActive: { background: '#667eea', color: '#fff', border: '1.5px solid #667eea' },
  totalBanner: { background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 },
  totalAmount: { fontSize: 24, fontWeight: 800, color: '#fff' },
};
