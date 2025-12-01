import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import FormSection1 from '../components/FormSection1';
import FormSection2 from '../components/FormSection2';

export default function FormView() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/form/${token}`
      );
      setData(response.data);
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (fields: any, files?: FileList, fieldNames?: Record<string, string>) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('fields', JSON.stringify(fields));
      
      if (files && files.length > 0) {
        Array.from(files).forEach((file) => {
          formData.append('files', file);
        });
        if (fieldNames) {
          formData.append('fieldNames', JSON.stringify(fieldNames));
        }
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/form/${token}/save`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      alert('Tallennettu!');
    } catch (error: any) {
      console.error('Error saving form:', error);
      const errorMessage = error.response?.data?.error || 'Tallennus epäonnistui';
      alert(errorMessage);
      throw error; // Re-throw so caller knows it failed
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (fields: any, files?: FileList, fieldNames?: Record<string, string>) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('fields', JSON.stringify(fields));
      
      if (files) {
        Array.from(files).forEach((file) => {
          formData.append('files', file);
        });
        if (fieldNames) {
          formData.append('fieldNames', JSON.stringify(fieldNames));
        }
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/form/${token}/submit`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      alert('Lomake lähetetty onnistuneesti!');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Lomakkeen lähetys epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!token) return;
    
    if (!confirm('Haluatko varmasti poistaa tämän tiedoston?')) {
      return;
    }

    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/form/${token}/file/${fileId}`
      );
      // Reload data after deletion
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      alert(error.response?.data?.error || 'Tiedoston poisto epäonnistui');
    }
  };

  if (loading) {
    return <div className="container">Ladataan lomaketta...</div>;
  }

  if (!data) {
    return <div className="container">Lomaketta ei löytynyt</div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>LÄHTÖTIEDOT RAKENNUSLUPAKUVIEN SUUNNITTELUA VARTEN</h1>
      <div className="card">
        <p><strong>Asiakas:</strong> {data.customer.name}</p>
        <p><strong>Sähköposti:</strong> {data.customer.email}</p>
      </div>

      {currentSection === 1 ? (
        <FormSection1
          data={data.submission}
          token={token || ''}
          onSave={async (fields, files, fieldNames) => {
            await handleSave(fields, files, fieldNames);
            // Reload data after save to ensure consistency
            await fetchData();
          }}
          onDeleteFile={handleDeleteFile}
          onNext={() => setCurrentSection(2)}
        />
      ) : (
        <FormSection2
          data={data.submission}
          token={token || ''}
          onSave={async (fields, files, fieldNames) => {
            await handleSave(fields, files, fieldNames);
            // Reload data after save to ensure consistency
            await fetchData();
          }}
          onDeleteFile={handleDeleteFile}
          onSubmit={handleSubmit}
          onBack={async () => {
            // Reload data before going back to ensure latest data is shown
            await fetchData();
            setCurrentSection(1);
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

