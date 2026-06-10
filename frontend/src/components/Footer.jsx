export default function Footer() {
  return (
    <footer style={S.footer}>
      <span style={S.text}>Pangugal</span>
      <span style={S.dot}>·</span>
      <span style={S.version}>v1.0.0</span>
      <span style={S.dot}>·</span>
      <span style={S.text}>Split expenses with friends</span>
    </footer>
  );
}

const S = {
  footer: { textAlign: 'center', padding: '24px 16px', marginTop: 40, borderTop: '1px solid #eee', color: '#bbb', fontSize: 13 },
  text: { color: '#bbb' },
  dot: { margin: '0 8px', color: '#ddd' },
  version: { color: '#667eea', fontWeight: 600 },
};
