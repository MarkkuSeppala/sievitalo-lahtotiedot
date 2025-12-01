import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Submission {
  id: number;
  status: string;
  submitted_at: string | null;
  created_at: string;
  customer_name: string;
  customer_email: string;
  token: string;
}

export default function SubmissionList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      fetchByCustomer(token);
    } else {
      fetchAll();
    }
  }, [token]);

  const fetchAll = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/submissions`);
      setSubmissions(response.data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchByCustomer = async (customerToken: string) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/customers/${customerToken}/submissions`
      );
      setSubmissions(response.data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container">Ladataan...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Lomakkeiden vastaukset</h1>
        {!token && (
          <Link to="/customers" className="btn btn-secondary">
            Takaisin asiakkaisiin
          </Link>
        )}
      </div>

      <div className="card">
        {submissions.length === 0 ? (
          <p>Ei vastauksia vielä.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Asiakas</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Lähetetty</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Toiminnot</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>
                    <div>
                      <strong>{submission.customer_name}</strong>
                      <br />
                      <small>{submission.customer_email}</small>
                    </div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: submission.status === 'submitted' ? '#28a745' : '#ffc107',
                        color: 'white',
                        fontSize: '12px'
                      }}
                    >
                      {submission.status === 'submitted' ? 'Lähetetty' : 'Luonnos'}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {submission.submitted_at
                      ? new Date(submission.submitted_at).toLocaleString('fi-FI')
                      : '-'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <Link to={`/submissions/${submission.id}`} className="btn btn-primary">
                      Tarkastele
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

