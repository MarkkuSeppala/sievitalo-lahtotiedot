import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function CreateRepresentative() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'edustaja' | 'suunnittelija'>('edustaja');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="container">
        <div className="card">
          <h2>Pääsy kielletty</h2>
          <p>Sinulla ei ole oikeuksia tähän sivuun.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/register`,
        { email, password, role }
      );

      setSuccess(`Käyttäjä luotu onnistuneesti! Rooli: ${role === 'edustaja' ? 'Edustaja' : 'Suunnittelija'}`);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Käyttäjän luonti epäonnistui');
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>Luo uusi käyttäjä</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Sähköposti *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Salasana *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Rooli *</label>
            <div className="radio-group">
              <div className="radio-option">
                <input
                  type="radio"
                  name="role"
                  id="role_edustaja"
                  value="edustaja"
                  checked={role === 'edustaja'}
                  onChange={(e) => setRole(e.target.value as 'edustaja' | 'suunnittelija')}
                />
                <label htmlFor="role_edustaja">Edustaja</label>
              </div>
              <div className="radio-option">
                <input
                  type="radio"
                  name="role"
                  id="role_suunnittelija"
                  value="suunnittelija"
                  checked={role === 'suunnittelija'}
                  onChange={(e) => setRole(e.target.value as 'edustaja' | 'suunnittelija')}
                />
                <label htmlFor="role_suunnittelija">Suunnittelija</label>
              </div>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary">
              Luo käyttäjä
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
            >
              Takaisin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}






