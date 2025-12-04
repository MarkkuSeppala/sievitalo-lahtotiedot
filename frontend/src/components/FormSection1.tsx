import { useState, useEffect } from 'react';

interface FormSection1Props {
  data: any;
  token: string;
  onSave: (fields: any, files?: FileList, fieldNames?: Record<string, string>) => void;
  onDeleteFile: (fileId: number) => void;
  onNext: () => void;
}

export default function FormSection1({ data, onSave, onDeleteFile, onNext }: FormSection1Props) {
  const [fields, setFields] = useState<any>({
    email: '',
    name1: '',
    name2: '',
    rakennuspaikkakunta: '',
    talousrakennus_ulkomitat: '',
    sokkelin_korko: '',
    vesi_viemari_liitos: '',
    ...data?.fields
  });

  const [fileInputs, setFileInputs] = useState<Record<string, FileList | null>>({});

  useEffect(() => {
    if (data?.fields) {
      setFields((prev: any) => ({ ...prev, ...data.fields }));
    }
  }, [data]);
  
  // Get saved files from data
  const savedFiles = data?.files || {};
  
  // Helper component to display saved files
  const SavedFilesList = ({ fieldName }: { fieldName: string }) => {
    const files = savedFiles[fieldName];
    if (!files || files.length === 0) return null;
    
    return (
      <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
        <strong>Tallennetut tiedostot:</strong>
        <ul style={{ marginTop: '4px', marginLeft: '20px', listStyleType: 'disc' }}>
          {files.map((file: any, idx: number) => (
            <li key={idx} style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a 
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${file.url}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#007bff', textDecoration: 'underline' }}
              >
                {file.name}
              </a>
              <button
                type="button"
                onClick={() => file.id && onDeleteFile(file.id)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="Poista tiedosto"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const handleChange = (name: string, value: any) => {
    setFields((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (name: string, files: FileList | null) => {
    setFileInputs((prev) => ({ ...prev, [name]: files }));
  };

  const handleSave = async () => {
    const allFiles = new DataTransfer();
    const fieldNames: Record<string, string> = {};
    
    Object.entries(fileInputs).forEach(([fieldName, fileList]) => {
      if (fileList) {
        Array.from(fileList).forEach((file) => {
          allFiles.items.add(file);
          fieldNames[file.name] = fieldName;
        });
      }
    });
    
    await onSave(fields, allFiles.files.length > 0 ? allFiles.files : undefined, fieldNames);
  };

  return (
    <div className="card">
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <img
          src="/sievitalo-logo.png"
          alt="Sievitalo"
          style={{
            height: '105px',
            width: 'auto',
            objectFit: 'contain'
          }}
        />
      </div>
      <h2>Osio 1/2</h2>

      <div className="form-group">
        <label>Sähköposti</label>
        <input
          type="email"
          value={fields.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
          required
        />
      </div>

      <div style={{ marginTop: '30px', marginBottom: '20px' }}>
        <h3>Rakentajien nimet ja rakennuspaikkakunta</h3>
      </div>

      <div className="form-group">
        <label>Nimi 1:</label>
        <input
          type="text"
          value={fields.name1 || ''}
          onChange={(e) => handleChange('name1', e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Nimi 2:</label>
        <input
          type="text"
          value={fields.name2 || ''}
          onChange={(e) => handleChange('name2', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Rakennuspaikkakunta:</label>
        <input
          type="text"
          value={fields.rakennuspaikkakunta || ''}
          onChange={(e) => handleChange('rakennuspaikkakunta', e.target.value)}
          required
        />
      </div>

      <div style={{ marginTop: '30px', marginBottom: '20px' }}>
        <p>
          Useimmista kunnista on maksua vastaan saatavilla tietopaketti, joka sisältää kaavaotteen,
          kaavamääräykset, rakentamistapaohjeet sekä virallisen tonttikartan dwg-muodossa.
          Dwg-muotoinen tonttikartta muodostuu myös maaperätutkimuksen yhteydessä.
        </p>
        <p>
          Mikäli dwg-karttaa ei saa noista lähteistä, se pitää tilata Maanmittauslaitokselta.{' '}
          <a href="https://www.maanmittauslaitos.fi/kartat-ja-paikkatieto/kartat/osta-kartta" target="_blank" rel="noopener noreferrer">
            Maanmittauslaitos karttakauppa
          </a>
        </p>
      </div>

      <div className="form-group">
        <label>Kaavaote, kaavamääräykset, rakentamistapaohjeet</label>
        <input
          type="file"
          multiple
          onChange={(e) => handleFileChange('kaavaote', e.target.files)}
        />
        <SavedFilesList fieldName="kaavaote" />
      </div>

      <div className="form-group">
        <label>Virallinen tonttikartta asemapiirroksen laatimista varten myös sähköisenä dwg-muodossa</label>
        <input
          type="file"
          multiple
          onChange={(e) => handleFileChange('tonttikartta', e.target.files)}
        />
        <SavedFilesList fieldName="tonttikartta" />
      </div>

      <div className="form-group">
        <label>Selvitä tarvitaanko tontillanne vesi- ja viemäriliitoskohtalausunto ja johtokartta. Jos nämä tarvitaan, ne ovat yleensä saatavilla kunnan vesi- ja viemärilaitokselta.</label>
        <div className="radio-group">
          <div className="radio-option">
            <input
              type="radio"
              name="vesi_viemari_liitos"
              id="vesi_viemari_tarvitaan"
              value="tarvitaan"
              checked={fields.vesi_viemari_liitos === 'tarvitaan'}
              onChange={(e) => handleChange('vesi_viemari_liitos', e.target.value)}
            />
            <label htmlFor="vesi_viemari_tarvitaan">Tarvitaan</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="vesi_viemari_liitos"
              id="vesi_viemari_ei_tarvita"
              value="ei_tarvita"
              checked={fields.vesi_viemari_liitos === 'ei_tarvita'}
              onChange={(e) => handleChange('vesi_viemari_liitos', e.target.value)}
            />
            <label htmlFor="vesi_viemari_ei_tarvita">Ei tarvita</label>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Mikäli vesi- ja viemäriliitoskohtalausunto ja johtokartta tarvitaan, lataa dokumentit tässä.</label>
        <input
          type="file"
          multiple
          onChange={(e) => handleFileChange('vesi_viemari_lausunto', e.target.files)}
        />
        <SavedFilesList fieldName="vesi_viemari_lausunto" />
      </div>

      <div className="form-group">
        <label>
          Jos asemakuvassa esitetään myös jonkun muun kuin Sievitalon toimittama talousrakennus,
          syötä alla olevaan kenttään talousrakennuksen ulkomitat.
        </label>
        <p style={{ fontSize: '12px', color: '#666' }}>(Esim. 10,2 x 6,1 m)</p>
        <input
          type="text"
          value={fields.talousrakennus_ulkomitat || ''}
          onChange={(e) => handleChange('talousrakennus_ulkomitat', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Sokkelin tai lattian korko. Eli mille korkeudelle talo rakennetaan. Koron määrittää pääsuunnittelijanne.</label>
        <input
          type="text"
          value={fields.sokkelin_korko || ''}
          onChange={(e) => handleChange('sokkelin_korko', e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>
          Sijoitusluonnos
        </label>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Piirros, josta näkyy rakennusten sijainnit tontilla, etäisyydet rajoista, rakennusten harjalinjat,
          pääoven paikka, tiejärjestelyt, autopaikat, sekä säilytettävä/istutettava kasvillisuus
          (jos rakennusvalvonta vaatii kasvillisuuden asemapiirrokseen)
        </p>
        <input
          type="file"
          multiple
          onChange={(e) => handleFileChange('sijoitusluonnos', e.target.files)}
        />
        <SavedFilesList fieldName="sijoitusluonnos" />
      </div>

      <div className="form-group">
        <label>
          Pohjatutkimusaineisto (maaperätutkimus ja perustamistapalausunto)
        </label>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Pohjatutkimus sisältää tutkimuskartan, kairausdiagrammit sekä tutkimuksen tekijän allekirjoittaman lausuntosivun.
        </p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Ellei pohjatutkimusta tehdä, toimitettava vastaavan työnjohtajan allekirjoittama lausunto maaperän kantavuudesta. Suositeltavampi vaihtoehto on kuitenkin maaperätutkimuksella todettu pohjapaineen arvo, jotta voidaan laskennallisesti todeta, mikä on tarvittava perustuksen sallittu minimileveys.
        </p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Vastuuasioista johtuen lausunnon merkintätapa tulee olla yksiselitteinen, numeroin esitetty sekä allekirjoituksella kuitattu.
        </p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Mikäli perustukset ovat asiakashankintana, perustussuunnittelu ei tule Sievitalolta eikä näitä tietoja tarvita.
        </p>
        <input
          type="file"
          multiple
          onChange={(e) => handleFileChange('pohjatutkimus', e.target.files)}
        />
        <SavedFilesList fieldName="pohjatutkimus" />
      </div>

      <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
        <button type="button" onClick={handleSave} className="btn btn-secondary">
          Tallenna
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await handleSave();
              onNext();
            } catch (error) {
              // Error already handled in handleSave
            }
          }}
          className="btn btn-primary"
        >
          Jatka seuraavaan osioon
        </button>
      </div>
    </div>
  );
}

