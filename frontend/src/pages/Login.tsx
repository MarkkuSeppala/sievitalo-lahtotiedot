import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kirjautuminen epäonnistui');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <img
        src="/sievitalo-logo.png"
        alt="Sievitalo"
        style={{
          height: '120px',
          width: 'auto',
          objectFit: 'contain',
          marginBottom: '30px'
        }}
      />
      <div className="card" style={{ width: '400px' }}>
        <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>Kirjaudu sisään</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Sähköposti</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Salasana</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Kirjaudu
          </button>
        </form>
      </div>
    </div>
  );
}

