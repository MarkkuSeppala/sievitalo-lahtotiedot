import { useState, useEffect } from 'react';

interface FormSection2Props {
  data: any;
  token: string;
  onSave: (fields: any, files?: FileList, fieldNames?: Record<string, string>) => void;
  onDeleteFile: (fileId: number) => void;
  onSubmit: (fields: any, files?: FileList, fieldNames?: Record<string, string>) => void;
  onBack: () => void;
  saving: boolean;
}

export default function FormSection2({ data, onSave, onDeleteFile, onSubmit, onBack, saving }: FormSection2Props) {
  const [fields, setFields] = useState<any>({
    vesijohtotiedot: '',
    salaoja_sadevesi: '',
    viemarointi: '',
    liesituuletin: '',
    lamponlahde: '',
    radonin_torjunta: '',
    sahkoverkkoyhtio: '',
    tonttikeskus: '',
    sahko_liittymiskohta: '',
    paasulakekoko: '',
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

  const handleSave = () => {
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
    
    onSave(fields, allFiles.files.length > 0 ? allFiles.files : undefined, fieldNames);
  };

  const handleSubmit = () => {
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
    
    onSubmit(fields, allFiles.files.length > 0 ? allFiles.files : undefined, fieldNames);
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
      <h2>Osio 2/2</h2>

      <div style={{ marginTop: '30px', marginBottom: '20px' }}>
        <h3>HUOM!</h3>
        <p>
          Myös asiakashankintana tulevien varusteiden, kuten tulisijat, hormit, kylpy- ja poreammeet,
          liesituulettimen tiedot sekä lasiterassien mitat on toimitettava ennen suunnittelun aloittamista.
          Nämä tiedot voi lähettää edustajan sähköpostiin.
        </p>
        <p>Lasiterassit piirretään suunnitelmiin tuntihinnalla.</p>
        <p>
          Julkisivujen värit ja värikoodit tulee syöttää Raksa-ohjelman materiaalivalikkoon suunnitteluvaiheessa.
          Raksa-ohjelman tunnukset toimitetaan myöhemmin.
        </p>
      </div>

      <div style={{ marginTop: '30px', marginBottom: '20px' }}>
        <h3>TALOTEKNIIKAN LÄHTÖTIEDOT</h3>
      </div>

      <div className="form-group">
        <label>Vesijohtotiedot</label>
        <div className="radio-group">
          <div className="radio-option">
            <input
              type="radio"
              name="vesijohtotiedot"
              id="vesijohto_kunnallistekniikka"
              value="kunnallistekniikka"
              checked={fields.vesijohtotiedot === 'kunnallistekniikka'}
              onChange={(e) => handleChange('vesijohtotiedot', e.target.value)}
            />
            <label htmlFor="vesijohto_kunnallistekniikka">Kunnallistekniikka</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="vesijohtotiedot"
              id="vesijohto_porakaivo"
              value="porakaivo"
              checked={fields.vesijohtotiedot === 'porakaivo'}
              onChange={(e) => handleChange('vesijohtotiedot', e.target.value)}
            />
            <label htmlFor="vesijohto_porakaivo">Porakaivo</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="vesijohtotiedot"
              id="vesijohto_avokaivo"
              value="avokaivo"
              checked={fields.vesijohtotiedot === 'avokaivo'}
              onChange={(e) => handleChange('vesijohtotiedot', e.target.value)}
            />
            <label htmlFor="vesijohto_avokaivo">Avokaivo</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="vesijohtotiedot"
              id="vesijohto_muu"
              value="muu"
              checked={fields.vesijohtotiedot === 'muu'}
              onChange={(e) => handleChange('vesijohtotiedot', e.target.value)}
            />
            <label htmlFor="vesijohto_muu">Muu:</label>
            {fields.vesijohtotiedot === 'muu' && (
              <input
                type="text"
                value={fields.vesijohtotiedot_muu || ''}
                onChange={(e) => handleChange('vesijohtotiedot_muu', e.target.value)}
                placeholder="Määritä"
              />
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Salaoja- ja sadevesien poisto tontilta</label>
        <div className="radio-group">
          <div className="radio-option">
            <input
              type="radio"
              name="salaoja_sadevesi"
              id="salaoja_kunnallistekniikka"
              value="kunnallistekniikka"
              checked={fields.salaoja_sadevesi === 'kunnallistekniikka'}
              onChange={(e) => handleChange('salaoja_sadevesi', e.target.value)}
            />
            <label htmlFor="salaoja_kunnallistekniikka">Kunnallistekniikka</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="salaoja_sadevesi"
              id="salaoja_imeytys"
              value="imeytys"
              checked={fields.salaoja_sadevesi === 'imeytys'}
              onChange={(e) => handleChange('salaoja_sadevesi', e.target.value)}
            />
            <label htmlFor="salaoja_imeytys">Imeytys</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="salaoja_sadevesi"
              id="salaoja_avo_oja"
              value="avo_oja"
              checked={fields.salaoja_sadevesi === 'avo_oja'}
              onChange={(e) => handleChange('salaoja_sadevesi', e.target.value)}
            />
            <label htmlFor="salaoja_avo_oja">Avo-oja</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="salaoja_sadevesi"
              id="salaoja_muu"
              value="muu"
              checked={fields.salaoja_sadevesi === 'muu'}
              onChange={(e) => handleChange('salaoja_sadevesi', e.target.value)}
            />
            <label htmlFor="salaoja_muu">Muu:</label>
            {fields.salaoja_sadevesi === 'muu' && (
              <input
                type="text"
                value={fields.salaoja_sadevesi_muu || ''}
                onChange={(e) => handleChange('salaoja_sadevesi_muu', e.target.value)}
                placeholder="Määritä"
              />
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Viemäröinti</label>
        <div className="radio-group">
          <div className="radio-option">
            <input
              type="radio"
              name="viemarointi"
              id="viemari_kunnallistekniikka"
              value="kunnallistekniikka"
              checked={fields.viemarointi === 'kunnallistekniikka'}
              onChange={(e) => handleChange('viemarointi', e.target.value)}
            />
            <label htmlFor="viemari_kunnallistekniikka">Kunnallistekniikka</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="viemarointi"
              id="viemari_wc_pullokaivo"
              value="wc_pullokaivo"
              checked={fields.viemarointi === 'wc_pullokaivo'}
              onChange={(e) => handleChange('viemarointi', e.target.value)}
            />
            <label htmlFor="viemari_wc_pullokaivo">WC-pullokaivo</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="viemarointi"
              id="viemari_panospuhdistamo"
              value="panospuhdistamo"
              checked={fields.viemarointi === 'panospuhdistamo'}
              onChange={(e) => handleChange('viemarointi', e.target.value)}
            />
            <label htmlFor="viemari_panospuhdistamo">Panospuhdistamo</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="viemarointi"
              id="viemari_imeytys_kaikki"
              value="imeytys_kaikki"
              checked={fields.viemarointi === 'imeytys_kaikki'}
              onChange={(e) => handleChange('viemarointi', e.target.value)}
            />
            <label htmlFor="viemari_imeytys_kaikki">Imeytys kaikki</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="viemarointi"
              id="viemari_imeytys_harmaat"
              value="imeytys_harmaat"
              checked={fields.viemarointi === 'imeytys_harmaat'}
              onChange={(e) => handleChange('viemarointi', e.target.value)}
            />
            <label htmlFor="viemari_imeytys_harmaat">Imeytys harmaat vedet</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="viemarointi"
              id="viemari_muu"
              value="muu"
              checked={fields.viemarointi === 'muu'}
              onChange={(e) => handleChange('viemarointi', e.target.value)}
            />
            <label htmlFor="viemari_muu">Muu:</label>
            {fields.viemarointi === 'muu' && (
              <input
                type="text"
                value={fields.viemarointi_muu || ''}
                onChange={(e) => handleChange('viemarointi_muu', e.target.value)}
                placeholder="Määritä"
              />
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Liesituuletin</label>
        <div className="radio-group">
          <div className="radio-option">
            <input
              type="radio"
              name="liesituuletin"
              id="liesi_sievitalon"
              value="sievitalon_toimitus"
              checked={fields.liesituuletin === 'sievitalon_toimitus'}
              onChange={(e) => handleChange('liesituuletin', e.target.value)}
            />
            <label htmlFor="liesi_sievitalon">Liesituuletin tulee Sievitalon toimituksena</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="liesituuletin"
              id="liesi_oma_moottori"
              value="oma_moottori"
              checked={fields.liesituuletin === 'oma_moottori'}
              onChange={(e) => handleChange('liesituuletin', e.target.value)}
            />
            <label htmlFor="liesi_oma_moottori">Liesituuletin omalla moottorilla (asiakashankinta)</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="liesituuletin"
              id="liesi_kupu_huippuimuri"
              value="liesikupu_huippuimuri"
              checked={fields.liesituuletin === 'liesikupu_huippuimuri'}
              onChange={(e) => handleChange('liesituuletin', e.target.value)}
            />
            <label htmlFor="liesi_kupu_huippuimuri">Liesikupu ja huippuimuri (asiakashankintana)</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="liesituuletin"
              id="liesi_induktioliesi"
              value="induktioliesi"
              checked={fields.liesituuletin === 'induktioliesi'}
              onChange={(e) => handleChange('liesituuletin', e.target.value)}
            />
            <label htmlFor="liesi_induktioliesi">Indukti liesi aktiivihiilisuodattimella (asiakashankintana)</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="liesituuletin"
              id="liesi_muu"
              value="muu"
              checked={fields.liesituuletin === 'muu'}
              onChange={(e) => handleChange('liesituuletin', e.target.value)}
            />
            <label htmlFor="liesi_muu">Muu:</label>
            {fields.liesituuletin === 'muu' && (
              <input
                type="text"
                value={fields.liesituuletin_muu || ''}
                onChange={(e) => handleChange('liesituuletin_muu', e.target.value)}
                placeholder="Määritä"
              />
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Lämmönlähde</label>
        <div className="radio-group">
          <div className="radio-option">
            <input
              type="radio"
              name="lamponlahde"
              id="lampo_sievitalon"
              value="sievitalon_toimitus"
              checked={fields.lamponlahde === 'sievitalon_toimitus'}
              onChange={(e) => handleChange('lamponlahde', e.target.value)}
            />
            <label htmlFor="lampo_sievitalon">Lämmönlähde Sievitalon toimituksena</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="lamponlahde"
              id="lampo_suursahko"
              value="suursahko"
              checked={fields.lamponlahde === 'suursahko'}
              onChange={(e) => handleChange('lamponlahde', e.target.value)}
            />
            <label htmlFor="lampo_suursahko">Suorasähkö (asiakashankintana)</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="lamponlahde"
              id="lampo_vilp"
              value="vilp"
              checked={fields.lamponlahde === 'vilp'}
              onChange={(e) => handleChange('lamponlahde', e.target.value)}
            />
            <label htmlFor="lampo_vilp">Vesi-ilmalämpöpumppu eli VILP (asiakashankintana)</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="lamponlahde"
              id="lampo_pilp"
              value="pilp"
              checked={fields.lamponlahde === 'pilp'}
              onChange={(e) => handleChange('lamponlahde', e.target.value)}
            />
            <label htmlFor="lampo_pilp">Poistoilmalämpöpumppu eli PILP (asiakashankintana)</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="lamponlahde"
              id="lampo_kaukolampo"
              value="kaukolampo"
              checked={fields.lamponlahde === 'kaukolampo'}
              onChange={(e) => handleChange('lamponlahde', e.target.value)}
            />
            <label htmlFor="lampo_kaukolampo">Kaukolämpö (asiakashankintana)</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="lamponlahde"
              id="lampo_maalampo"
              value="maalampo"
              checked={fields.lamponlahde === 'maalampo'}
              onChange={(e) => handleChange('lamponlahde', e.target.value)}
            />
            <label htmlFor="lampo_maalampo">Maalämpö (asiakashankintana)</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="lamponlahde"
              id="lampo_muu"
              value="muu"
              checked={fields.lamponlahde === 'muu'}
              onChange={(e) => handleChange('lamponlahde', e.target.value)}
            />
            <label htmlFor="lampo_muu">Muu:</label>
            {fields.lamponlahde === 'muu' && (
              <input
                type="text"
                value={fields.lamponlahde_muu || ''}
                onChange={(e) => handleChange('lamponlahde_muu', e.target.value)}
                placeholder="Määritä"
              />
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Radonin torjunta</label>
        <div className="radio-group">
          <div className="radio-option">
            <input
              type="radio"
              name="radonin_torjunta"
              id="radon_ei_tarvita"
              value="ei_tarvita"
              checked={fields.radonin_torjunta === 'ei_tarvita'}
              onChange={(e) => handleChange('radonin_torjunta', e.target.value)}
            />
            <label htmlFor="radon_ei_tarvita">Kohteessa ei tarvita radonsuojausta</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="radonin_torjunta"
              id="radon_sievitalon"
              value="sievitalon_toimitus"
              checked={fields.radonin_torjunta === 'sievitalon_toimitus'}
              onChange={(e) => handleChange('radonin_torjunta', e.target.value)}
            />
            <label htmlFor="radon_sievitalon">Radonjärjestelmä Sievitalon toimituksena</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="radonin_torjunta"
              id="radon_muu"
              value="muu"
              checked={fields.radonin_torjunta === 'muu'}
              onChange={(e) => handleChange('radonin_torjunta', e.target.value)}
            />
            <label htmlFor="radon_muu">Muu:</label>
            {fields.radonin_torjunta === 'muu' && (
              <input
                type="text"
                value={fields.radonin_torjunta_muu || ''}
                onChange={(e) => handleChange('radonin_torjunta_muu', e.target.value)}
                placeholder="Määritä"
              />
            )}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Sähköverkkoyhtiö</label>
        <input
          type="text"
          value={fields.sahkoverkkoyhtio || ''}
          onChange={(e) => handleChange('sahkoverkkoyhtio', e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Tonttikeskus</label>
        <div className="radio-group">
          <div className="radio-option">
            <input
              type="radio"
              name="tonttikeskus"
              id="tontti_sievitalon"
              value="sievitalon_toimitus"
              checked={fields.tonttikeskus === 'sievitalon_toimitus'}
              onChange={(e) => handleChange('tonttikeskus', e.target.value)}
            />
            <label htmlFor="tontti_sievitalon">Sisältyy Sievitalon toimitukseen</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="tonttikeskus"
              id="tontti_caruna"
              value="caruna"
              checked={fields.tonttikeskus === 'caruna'}
              onChange={(e) => handleChange('tonttikeskus', e.target.value)}
            />
            <label htmlFor="tontti_caruna">Carunan toimittama yhdistelmäkaappi (selvitä tämä, jos sähköverkkoyhtiö on Caruna)</label>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Sähköliittymiskohta</label>
        <div className="radio-group">
          <div className="radio-option">
            <input
              type="radio"
              name="sahko_liittymiskohta"
              id="sahko_maakaapeloituna"
              value="maakaapeloituna"
              checked={fields.sahko_liittymiskohta === 'maakaapeloituna'}
              onChange={(e) => handleChange('sahko_liittymiskohta', e.target.value)}
            />
            <label htmlFor="sahko_maakaapeloituna">Maakaapeloituna maassa</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="sahko_liittymiskohta"
              id="sahko_ilmakaapeloituna"
              value="ilmakaapeloituna"
              checked={fields.sahko_liittymiskohta === 'ilmakaapeloituna'}
              onChange={(e) => handleChange('sahko_liittymiskohta', e.target.value)}
            />
            <label htmlFor="sahko_ilmakaapeloituna">Ilmakaapeloituna sähkötolpassa</label>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Pääsulakekoko</label>
        <div className="radio-group">
          <div className="radio-option">
            <input
              type="radio"
              name="paasulakekoko"
              id="sulake_3x25"
              value="3x25"
              checked={fields.paasulakekoko === '3x25'}
              onChange={(e) => handleChange('paasulakekoko', e.target.value)}
            />
            <label htmlFor="sulake_3x25">3x25 A</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="paasulakekoko"
              id="sulake_3x35"
              value="3x35"
              checked={fields.paasulakekoko === '3x35'}
              onChange={(e) => handleChange('paasulakekoko', e.target.value)}
            />
            <label htmlFor="sulake_3x35">3x35 A (ellei tämä jo sisälly sopimukseen, lisähinta on 150 euroa). Tämä on ainoastaan sulakepohjan koko.</label>
          </div>
          <div className="radio-option">
            <input
              type="radio"
              name="paasulakekoko"
              id="sulake_en_osaa"
              value="en_osaa"
              checked={fields.paasulakekoko === 'en_osaa'}
              onChange={(e) => handleChange('paasulakekoko', e.target.value)}
            />
            <label htmlFor="sulake_en_osaa">En osaa sanoa</label>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>
          Sijoitusluonnos sähköasemapiirrosta varten.
        </label>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Piirros tontista ja rakennuksista, johon piirretty viiva osoittamaan tulevaa sähkökaapelin linjaa maan alla.
        </p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Tässä vaiheessa ei aina tiedetä tarkkaa kaapelin paikkaa. Vedä siinä tapauksessa kuvaan viiva,
          joka alkaa kohdasta, jossa sähkökaapeli tulee tontille ja päättyy talon tekniseen tilaan.
        </p>
        <input
          type="file"
          multiple
          onChange={(e) => handleFileChange('sahko_sijoitusluonnos', e.target.files)}
        />
        <SavedFilesList fieldName="sahko_sijoitusluonnos" />
      </div>

      <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onBack} className="btn btn-secondary">
          Takaisin
        </button>
        <button type="button" onClick={handleSave} className="btn btn-secondary" disabled={saving}>
          {saving ? 'Tallennetaan...' : 'Tallenna'}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? 'Lähetetään...' : 'Lähetä lomake'}
        </button>
      </div>
    </div>
  );
}

