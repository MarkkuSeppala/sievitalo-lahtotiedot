import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>Dashboard</h1>

      <div className="card">
        <h2>Tervetuloa</h2>
        <p>Käytä navigaatiota siirtyäksesi eri osioihin.</p>
      </div>

      {(user?.role === 'edustaja' || user?.role === 'admin') && (
        <div className="card">
          <h3 style={{ marginBottom: '15px' }}>Toiminnot</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link to="/customers" className="btn btn-primary">
              Asiakkaat
            </Link>
            <Link to="/customers/new" className="btn btn-primary">
              Luo uusi asiakastunnus
            </Link>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '15px' }}>Lomakkeet</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/submissions" className="btn btn-primary">
            Tarkastele vastauksia
          </Link>
          {user?.role === 'edustaja' && (
            <Link to="/customers" className="btn btn-secondary">
              Asiakkaat
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

