import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function adminHeaders() {
  return { headers: { 'x-admin-token': localStorage.getItem('pangugal_admin_token') } };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('pangugal_admin_token');
    if (!token) { navigate('/admin/login'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u, g, e] = await Promise.all([
        api.get('/admin/stats', adminHeaders()),
        api.get('/admin/users', adminHeaders()),
        api.get('/admin/groups', adminHeaders()),
        api.get('/admin/expenses', adminHeaders()),
      ]);
      setStats(s.data);
      setUsers(u.data.users);
      setGroups(g.data.groups);
      setExpenses(e.data.expenses);
    } catch {
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupExpenses(group) {
    setSelectedGroup(group);
    const res = await api.get(`/admin/groups/${group._id}/expenses`, adminHeaders());
    setGroupExpenses(res.data.expenses);
    setTab('groupExpenses');
  }

  function logout() {
    localStorage.removeItem('pangugal_admin_token');
    navigate('/admin/login');
  }

  const fmt = n => `₹${parseFloat(n || 0).toFixed(2)}`;
  const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={S.root}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.sideTop}>
          <h2 style={S.siteName}>Pangugal</h2>
          <p style={S.adminBadge}>ADMIN</p>
        </div>
        <nav style={S.nav}>
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'users', label: '👥 Users' },
            { key: 'groups', label: '🏘️ Groups' },
            { key: 'expenses', label: '💸 All Expenses' },
          ].map(item => (
            <button key={item.key} style={{ ...S.navItem, ...(tab === item.key ? S.navActive : {}) }} onClick={() => setTab(item.key)}>
              {item.label}
            </button>
          ))}
        </nav>
        <button style={S.logoutBtn} onClick={logout}>Logout</button>
      </div>

      {/* Main */}
      <div style={S.main}>
        {loading && <div style={S.loading}>Loading...</div>}

        {/* Overview */}
        {tab === 'overview' && stats && (
          <div>
            <h2 style={S.pageTitle}>Overview</h2>
            <div style={S.statsGrid}>
              <StatCard label="Total Users" value={stats.userCount} color="#667eea" />
              <StatCard label="Total Groups" value={stats.groupCount} color="#38a169" />
              <StatCard label="Total Expenses" value={stats.expenseCount} color="#ed8936" />
              <StatCard label="Total Spent" value={fmt(stats.totalSpentRupees)} color="#e53e3e" />
            </div>
            <h3 style={S.sectionTitle}>Recent Users</h3>
            <UserTable users={users.slice(0, 5)} fmtDate={fmtDate} />
            <h3 style={{ ...S.sectionTitle, marginTop: 28 }}>Recent Groups</h3>
            <GroupTable groups={groups.slice(0, 5)} fmtDate={fmtDate} onView={loadGroupExpenses} />
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <h2 style={S.pageTitle}>All Users ({users.length})</h2>
            <UserTable users={users} fmtDate={fmtDate} />
          </div>
        )}

        {/* Groups */}
        {tab === 'groups' && (
          <div>
            <h2 style={S.pageTitle}>All Groups ({groups.length})</h2>
            <GroupTable groups={groups} fmtDate={fmtDate} onView={loadGroupExpenses} />
          </div>
        )}

        {/* All Expenses */}
        {tab === 'expenses' && (
          <div>
            <h2 style={S.pageTitle}>All Expenses ({expenses.length})</h2>
            <ExpenseTable expenses={expenses} fmtDate={fmtDate} />
          </div>
        )}

        {/* Group Expenses drill-down */}
        {tab === 'groupExpenses' && selectedGroup && (
          <div>
            <button style={S.back} onClick={() => setTab('groups')}>← Back to Groups</button>
            <h2 style={S.pageTitle}>Expenses — {selectedGroup.name} ({groupExpenses.length})</h2>
            <ExpenseTable expenses={groupExpenses} fmtDate={fmtDate} showGroup={false} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...S.statCard, borderTop: `4px solid ${color}` }}>
      <p style={S.statLabel}>{label}</p>
      <p style={{ ...S.statValue, color }}>{value}</p>
    </div>
  );
}

function UserTable({ users, fmtDate }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr>{['Name', 'Email', 'Phone', 'Joined'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id} style={S.tr}>
              <td style={S.td}><strong>{u.name}</strong></td>
              <td style={S.td}>{u.email || '—'}</td>
              <td style={S.td}>{u.phone || '—'}</td>
              <td style={S.td}>{fmtDate(u.createdAt)}</td>
            </tr>
          ))}
          {users.length === 0 && <tr><td colSpan={4} style={S.empty}>No users yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function GroupTable({ groups, fmtDate, onView }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead><tr>{['Group Name', 'Created By', 'Members', 'Currency', 'Created', 'Expenses'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {groups.map(g => (
            <tr key={g._id} style={S.tr}>
              <td style={S.td}><strong>{g.name}</strong>{g.description && <span style={S.desc}> — {g.description}</span>}</td>
              <td style={S.td}>{g.createdBy?.name || '—'}</td>
              <td style={S.td}>{g.memberCount}</td>
              <td style={S.td}>{g.currency}</td>
              <td style={S.td}>{fmtDate(g.createdAt)}</td>
              <td style={S.td}><button style={S.viewBtn} onClick={() => onView(g)}>View</button></td>
            </tr>
          ))}
          {groups.length === 0 && <tr><td colSpan={6} style={S.empty}>No groups yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ExpenseTable({ expenses, fmtDate, showGroup = true }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>
            {['Description', showGroup && 'Group', 'Category', 'Amount', 'Paid By', 'Date'].filter(Boolean).map(h => <th key={h} style={S.th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => (
            <tr key={e._id} style={S.tr}>
              <td style={S.td}><strong>{e.description}</strong></td>
              {showGroup && <td style={S.td}>{e.groupId?.name || '—'}</td>}
              <td style={S.td}><span style={S.catBadge}>{e.category}</span></td>
              <td style={{ ...S.td, fontWeight: 700, color: '#e53e3e' }}>₹{(e.totalAmountPaisa / 100).toFixed(2)}</td>
              <td style={S.td}>{e.paidByUserId?.name || '—'}</td>
              <td style={S.td}>{fmtDate(e.date)}</td>
            </tr>
          ))}
          {expenses.length === 0 && <tr><td colSpan={6} style={S.empty}>No expenses yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

const S = {
  root: { display: 'flex', minHeight: '100vh', background: '#f7f8fc' },
  sidebar: { width: 220, background: '#1a202c', display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 },
  sideTop: { padding: '0 20px 24px', borderBottom: '1px solid #2d3748' },
  siteName: { color: '#fff', fontSize: 20, fontWeight: 800 },
  adminBadge: { color: '#fc8181', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginTop: 2 },
  nav: { flex: 1, padding: '16px 0' },
  navItem: { display: 'block', width: '100%', padding: '11px 20px', background: 'none', border: 'none', color: '#a0aec0', textAlign: 'left', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  navActive: { background: '#2d3748', color: '#fff', borderLeft: '3px solid #667eea' },
  logoutBtn: { margin: '0 16px 16px', padding: '9px', background: 'transparent', border: '1px solid #4a5568', color: '#a0aec0', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  main: { flex: 1, padding: '32px 28px', overflow: 'auto' },
  loading: { color: '#aaa', padding: 40 },
  pageTitle: { fontSize: 22, fontWeight: 800, marginBottom: 20, color: '#1a202c' },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#4a5568' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 },
  statCard: { background: '#fff', borderRadius: 12, padding: '20px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  statLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: 800 },
  tableWrap: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.5, background: '#f7f8fc', borderBottom: '1px solid #eee' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 14px', fontSize: 14, color: '#2d3748' },
  empty: { padding: '24px 14px', color: '#aaa', textAlign: 'center' },
  catBadge: { background: '#ebf4ff', color: '#4299e1', padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 },
  desc: { color: '#aaa', fontWeight: 400 },
  viewBtn: { padding: '4px 12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  back: { background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 14, fontWeight: 500, marginBottom: 16, padding: 0 },
};
