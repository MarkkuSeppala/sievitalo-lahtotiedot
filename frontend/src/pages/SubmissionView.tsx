import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

// Mapping of field names to human-readable labels (exact labels from the form)
const FILE_FIELD_LABELS: Record<string, string> = {
  kaavaote: 'Kaavaote, kaavamääräykset, rakentamistapaohjeet',
  tonttikartta: 'Virallinen tonttikartta asemapiirroksen laatimista varten myös sähköisenä dwg-muodossa',
  vesi_viemari_lausunto: 'Mikäli vesi- ja viemäriliitoskohtalausunto ja johtokartta tarvitaan, lataa dokumentit tässä.',
  sijoitusluonnos: 'Sijoitusluonnos',
  pohjatutkimus: 'Pohjatutkimusaineisto (maaperätutkimus ja perustamistapalausunto)',
  sahko_sijoitusluonnos: 'Sijoitusluonnos sähköasemapiirrosta varten.',
  general: 'Yleiset tiedostot'
};

export default function SubmissionView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [parsedFields, setParsedFields] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const customerToken = searchParams.get('customer');
    if (customerToken) {
      fetchByCustomer(customerToken);
    } else if (id) {
      fetchById(id);
    }
  }, [id, searchParams]);

  const fetchById = async (submissionId: string) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/submissions/${submissionId}`
      );
      const submission = response.data.submission;
      
      console.log('Submission data:', submission);
      console.log('Fields type:', typeof submission.fields);
      console.log('Fields value:', submission.fields);
      
      // Ensure fields is an object, not a string
      if (!submission.fields) {
        submission.fields = {};
      } else if (typeof submission.fields === 'string') {
        try {
          submission.fields = JSON.parse(submission.fields);
        } catch (e) {
          console.error('Error parsing fields:', e);
          submission.fields = {};
        }
      }
      
      // Parse fields BEFORE setting submission
      let parsedFieldsData: Record<string, any> = {};
      if (submission.fields) {
        let fields = submission.fields;
        console.log('Raw fields from backend:', fields);
        console.log('Fields type:', typeof fields);
        
        // Check if fields is a string-like object (has numeric keys)
        // This happens when a string is treated as an object
        if (typeof fields === 'object' && !Array.isArray(fields) && Object.keys(fields).every(key => !isNaN(Number(key)))) {
          // It's a string that was converted to an object - convert it back
          const stringValue = Object.values(fields).join('');
          console.log('Reconstructed string:', stringValue);
          try {
            fields = JSON.parse(stringValue);
            console.log('Parsed fields:', fields);
          } catch (e) {
            console.error('Error parsing fields:', e);
            fields = {};
          }
        } else if (typeof fields === 'string') {
          try {
            fields = JSON.parse(fields);
            console.log('Parsed fields:', fields);
          } catch (e) {
            console.error('Error parsing fields:', e);
            fields = {};
          }
        }
        
        if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
          parsedFieldsData = fields;
        }
      }
      
      console.log('Setting parsedFields:', parsedFieldsData);
      setParsedFields(parsedFieldsData);
      setSubmission(submission);
    } catch (error) {
      console.error('Error fetching submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchByCustomer = async (token: string) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/customers/${token}/submissions`
      );
      if (response.data.submissions && response.data.submissions.length > 0) {
        // Get the latest submission (already has fields and files from backend)
        const submission = response.data.submissions[0];
        
        // Parse fields BEFORE setting submission
        let parsedFieldsData: Record<string, any> = {};
        if (submission.fields) {
          let fields = submission.fields;
          console.log('Raw fields from backend (customer):', fields);
          console.log('Fields type:', typeof fields);
          
          // Check if fields is a string-like object (has numeric keys)
          // This happens when a string is treated as an object
          if (typeof fields === 'object' && !Array.isArray(fields) && Object.keys(fields).every(key => !isNaN(Number(key)))) {
            // It's a string that was converted to an object - convert it back
            const stringValue = Object.values(fields).join('');
            console.log('Reconstructed string (customer):', stringValue);
            try {
              fields = JSON.parse(stringValue);
              console.log('Parsed fields (customer):', fields);
            } catch (e) {
              console.error('Error parsing fields:', e);
              fields = {};
            }
          } else if (typeof fields === 'string') {
            try {
              fields = JSON.parse(fields);
              console.log('Parsed fields (customer):', fields);
            } catch (e) {
              console.error('Error parsing fields:', e);
              fields = {};
            }
          }
          
          if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
            parsedFieldsData = fields;
          }
        }
        
        console.log('Setting parsedFields (customer):', parsedFieldsData);
        setParsedFields(parsedFieldsData);
        setSubmission(submission);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching submission:', error);
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!submission?.id) return;
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/submissions/${submission.id}/pdf`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `submission-${submission.id}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  if (loading) {
    return <div className="container">Ladataan...</div>;
  }

  if (!submission) {
    return <div className="container">Vastausta ei löytynyt</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Lomakkeen vastaus</h1>
        <button onClick={exportPDF} className="btn btn-primary">
          Vie PDF:ksi
        </button>
      </div>

      <div className="card">
        <h2>Asiakastiedot</h2>
        <p><strong>Nimi:</strong> {submission.customer_name}</p>
        <p><strong>Sähköposti:</strong> {submission.customer_email}</p>
        <p><strong>Status:</strong> {submission.status}</p>
        {submission.submitted_at && (
          <p><strong>Lähetetty:</strong> {new Date(submission.submitted_at).toLocaleString('fi-FI')}</p>
        )}
      </div>

      <div className="card">
        <h2>Vastaukset</h2>
        {parsedFields && Object.keys(parsedFields).length > 0 ? (
          Object.entries(parsedFields).map(([key, value]: [string, any]) => {
            // Skip empty values
            if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
              return null;
            }
            
            // Format field name
            const fieldName = key
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase());
            
            // Format value
            let displayValue = '';
            if (Array.isArray(value)) {
              displayValue = value.join(', ');
            } else if (typeof value === 'object') {
              displayValue = JSON.stringify(value);
            } else {
              displayValue = String(value);
            }
            
            return (
              <div key={key} style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                <strong>{fieldName}:</strong> {displayValue}
              </div>
            );
          })
        ) : (
          <p>Ei vastauksia.</p>
        )}
      </div>

      {submission.files && Object.keys(submission.files).length > 0 && (
        <div className="card">
          <h2>Tiedostot</h2>
          {Object.entries(submission.files)
            .sort(([a], [b]) => {
              // Sort by predefined order if available, otherwise alphabetically
              const orderA = Object.keys(FILE_FIELD_LABELS).indexOf(a);
              const orderB = Object.keys(FILE_FIELD_LABELS).indexOf(b);
              if (orderA !== -1 && orderB !== -1) return orderA - orderB;
              if (orderA !== -1) return -1;
              if (orderB !== -1) return 1;
              return a.localeCompare(b);
            })
            .map(([fieldName, files]: [string, any]) => {
              // Get label from mapping - must match exactly with form labels
              const label = FILE_FIELD_LABELS[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              if (!FILE_FIELD_LABELS[fieldName]) {
                console.warn(`Missing label mapping for field: ${fieldName}. Using formatted field name instead.`);
              }
              return (
                <div key={fieldName} style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>{label}</h3>
                  <ul style={{ marginLeft: '20px', listStyleType: 'disc' }}>
                    {files.map((file: any, idx: number) => (
                      <li key={idx} style={{ marginBottom: '5px' }}>
                        <a 
                          href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${file.url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#007bff', textDecoration: 'underline' }}
                        >
                          {file.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

