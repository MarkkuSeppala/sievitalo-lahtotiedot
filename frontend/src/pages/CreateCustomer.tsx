import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function CreateCustomer() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/customers`,
        { name, email, name1, name2 }
      );

      setFormUrl(response.data.formUrl);
      setSuccess('Asiakastunnus luotu! Kopioi linkki alla olevasta kentästä ja lähetä se asiakkaalle.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Asiakastunnuksen luonti epäonnistui');
    }
  };

  return (
    <div className="container">
      <h1>Luo uusi asiakastunnus</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Asiakkaan nimi *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
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
            <label>Asiakas 1 nimi *</label>
            <input
              type="text"
              value={name1}
              onChange={(e) => setName1(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Asiakas 2 nimi</label>
            <input
              type="text"
              value={name2}
              onChange={(e) => setName2(e.target.value)}
            />
          </div>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          {!formUrl && (
            <button type="submit" className="btn btn-primary">
              Luo asiakastunnus
            </button>
          )}
        </form>

        {formUrl && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Lomakkeen linkki (kopioi ja lähetä asiakkaalle):
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={formUrl}
                readOnly
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(formUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {copied ? '✓ Kopioitu!' : 'Kopioi linkki'}
              </button>
            </div>
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="btn btn-primary"
              >
                Siirry asiakaslistaan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

