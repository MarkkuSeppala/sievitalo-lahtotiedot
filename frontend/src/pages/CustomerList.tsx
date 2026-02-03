import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Customer {
  id: number;
  name: string;
  email: string;
  token: string;
  created_at: string;
  submission_count: number;
  last_submission: string | null;
  edustaja_email?: string | null;
}

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/customers`);
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setShowConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    setDeletingId(customerToDelete.id);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/customers/${customerToDelete.id}`
      );
      setCustomers(customers.filter((c) => c.id !== customerToDelete.id));
      setShowConfirm(false);
      setCustomerToDelete(null);
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      alert(error.response?.data?.error || 'Asiakkaan poisto epäonnistui');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowConfirm(false);
    setCustomerToDelete(null);
  };

  if (loading) {
    return <div className="container">Ladataan...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Asiakkaat</h1>
        {(user?.role === 'edustaja' || user?.role === 'admin') && (
          <Link to="/customers/new" className="btn btn-primary">
            Luo uusi asiakastunnus
          </Link>
        )}
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Nimi</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Sähköposti</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Luotu</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Vastauksia</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Edustaja</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Toiminnot</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{customer.name}</td>
                <td style={{ padding: '10px' }}>{customer.email}</td>
                <td style={{ padding: '10px' }}>
                  {new Date(customer.created_at).toLocaleDateString('fi-FI')}
                </td>
                <td style={{ padding: '10px' }}>{customer.submission_count || 0}</td>
                <td style={{ padding: '10px' }}>{customer.edustaja_email ?? '–'}</td>
                <td style={{ padding: '10px' }}>
                  <a
                    href={`${window.location.origin}/form/${customer.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ marginRight: '5px', textDecoration: 'none', display: 'inline-block' }}
                  >
                    Avaa lomake
                  </a>
                  {customer.submission_count > 0 && (
                    <Link to={`/submissions?token=${customer.token}`} className="btn btn-primary" style={{ marginRight: '5px' }}>
                      Vastaukset
                    </Link>
                  )}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteClick(customer)}
                      className="btn"
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: deletingId === customer.id ? 'wait' : 'pointer',
                        opacity: deletingId === customer.id ? 0.6 : 1
                      }}
                      disabled={deletingId === customer.id}
                    >
                      {deletingId === customer.id ? 'Poistetaan...' : 'Poista'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showConfirm && customerToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%'
            }}
          >
            <h2 style={{ marginTop: 0 }}>Vahvista poisto</h2>
            <p>
              Haluatko varmasti poistaa asiakkaan <strong>{customerToDelete.name}</strong> (
              {customerToDelete.email})?
            </p>
            <p style={{ color: '#dc3545', fontSize: '14px' }}>
              Tämä poistaa myös kaikki asiakkaan vastaukset ja tiedostot. Toimintoa ei voi perua.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={handleDeleteCancel} className="btn btn-secondary">
                Peruuta
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn"
                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
              >
                Poista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

