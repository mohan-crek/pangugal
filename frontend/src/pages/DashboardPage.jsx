import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import api from '../api/axios';

export default function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then(r => r.data),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['summary'],
    queryFn: () => api.get('/dashboard/summary').then(r => r.data),
  });

  const createGroup = useMutation({
    mutationFn: data => api.post('/groups', data),
    onSuccess: () => { qc.invalidateQueries(['groups']); setShowCreate(false); setGroupName(''); setGroupDesc(''); },
  });

  const summary = summaryData || { totalOwed: 0, totalOwing: 0, netBalance: 0 };
  const groups = groupsData?.groups || [];

  return (
    <div>
      <Navbar />
      <div style={S.page}>
        {/* Summary Banner */}
        <div style={S.banner}>
          <div style={S.bannerItem}>
            <span style={S.bannerLabel}>You are owed</span>
            <span style={{ ...S.bannerAmount, color: '#38a169' }}>₹{summary.totalOwed.toFixed(2)}</span>
          </div>
          <div style={S.divider} />
          <div style={S.bannerItem}>
            <span style={S.bannerLabel}>You owe</span>
            <span style={{ ...S.bannerAmount, color: '#e53e3e' }}>₹{summary.totalOwing.toFixed(2)}</span>
          </div>
          <div style={S.divider} />
          <div style={S.bannerItem}>
            <span style={S.bannerLabel}>Net balance</span>
            <span style={{ ...S.bannerAmount, color: summary.netBalance >= 0 ? '#38a169' : '#e53e3e' }}>
              ₹{Math.abs(summary.netBalance).toFixed(2)} {summary.netBalance >= 0 ? '(+)' : '(-)'}
            </span>
          </div>
        </div>

        {/* Groups */}
        <div style={S.header}>
          <h2 style={S.title}>Your Groups</h2>
          <button style={S.btn} onClick={() => setShowCreate(true)}>+ New Group</button>
        </div>

        {groups.length === 0 && <p style={S.empty}>No groups yet. Create one to get started!</p>}

        <div style={S.grid}>
          {groups.map(g => (
            <div key={g._id} style={S.card} onClick={() => navigate(`/groups/${g._id}`)}>
              <div style={S.cardIcon}>{g.name[0].toUpperCase()}</div>
              <div style={S.cardBody}>
                <h3 style={S.cardName}>{g.name}</h3>
                {g.description && <p style={S.cardDesc}>{g.description}</p>}
                <span style={S.cardMeta}>{g.memberCount} member{g.memberCount !== 1 ? 's' : ''} · {g.currency}</span>
              </div>
              <span style={S.arrow}>›</span>
            </div>
          ))}
        </div>

        {/* Create Group Modal */}
        {showCreate && (
          <div style={S.overlay}>
            <div style={S.modal}>
              <h3 style={S.modalTitle}>Create Group</h3>
              <input style={S.input} placeholder="Group Name *" value={groupName} onChange={e => setGroupName(e.target.value)} />
              <input style={S.input} placeholder="Description (optional)" value={groupDesc} onChange={e => setGroupDesc(e.target.value)} />
              <div style={S.modalActions}>
                <button style={S.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                <button style={S.submitBtn} onClick={() => createGroup.mutate({ name: groupName, description: groupDesc })} disabled={!groupName || createGroup.isPending}>
                  {createGroup.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '24px 16px' },
  banner: { background: '#fff', borderRadius: 12, padding: '20px 24px', display: 'flex', gap: 0, marginBottom: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  bannerItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  bannerLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  bannerAmount: { fontSize: 22, fontWeight: 700 },
  divider: { width: 1, background: '#f0f0f0', margin: '0 16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 700 },
  btn: { padding: '8px 18px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  empty: { color: '#aaa', textAlign: 'center', padding: '40px 0' },
  grid: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#fff', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s' },
  cardIcon: { width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 600, marginBottom: 2 },
  cardDesc: { fontSize: 13, color: '#888', marginBottom: 2 },
  cardMeta: { fontSize: 12, color: '#aaa' },
  arrow: { fontSize: 22, color: '#ccc' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  input: { padding: '11px 13px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, outline: 'none' },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  cancelBtn: { padding: '9px 18px', border: '1.5px solid #e0e0e0', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  submitBtn: { padding: '9px 18px', background: '#667eea', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
};
