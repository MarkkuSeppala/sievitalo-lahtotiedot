import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '15px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <img
          src="/sievitalo-logo.png"
          alt="Sievitalo"
          style={{
            height: '105px',
            width: 'auto',
            objectFit: 'contain'
          }}
        />
        {user && (
          <nav style={{ display: 'flex', gap: '15px', marginLeft: '20px' }}>
            <Link to="/dashboard" style={{ textDecoration: 'none', color: '#333' }}>
              Dashboard
            </Link>
            {user.role === 'edustaja' && (
              <Link to="/customers" style={{ textDecoration: 'none', color: '#333' }}>
                Asiakkaat
              </Link>
            )}
            <Link to="/submissions" style={{ textDecoration: 'none', color: '#333' }}>
              Vastaukset
            </Link>
            {user.role === 'admin' && (
              <Link to="/representatives/new" style={{ textDecoration: 'none', color: '#333' }}>
                Luo käyttäjä
              </Link>
            )}
          </nav>
        )}
      </div>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>
            {user.email} ({user.role})
          </span>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
            Kirjaudu ulos
          </button>
        </div>
      )}
    </header>
  );
}

