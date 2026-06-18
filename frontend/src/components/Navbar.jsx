import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav style={S.nav}>
      <Link to="/" style={S.logo}>Pangugal</Link>
      <div style={S.right}>
        <Link to="/profile" style={S.profileLink}>
          <div style={S.avatarSmall}>{user?.name?.[0]?.toUpperCase()}</div>
          <span style={S.name}>{user?.name}</span>
        </Link>
        <button style={S.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

const S = {
  nav: { background: '#fff', borderBottom: '1px solid #e8e8e8', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 },
  logo: { fontSize: 22, fontWeight: 800, color: '#667eea', textDecoration: 'none' },
  right: { display: 'flex', alignItems: 'center', gap: 16 },
  profileLink: { display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' },
  avatarSmall: { width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 },
  name: { fontSize: 14, color: '#555', fontWeight: 500 },
  logoutBtn: { padding: '6px 14px', border: '1.5px solid #e0e0e0', background: 'transparent', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#555' },
};
