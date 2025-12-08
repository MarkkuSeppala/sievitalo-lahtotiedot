# Suunnittelun lähtötiedot -sovellus

Sovellus korvaa Google Forms -lomakkeen rakennuslupakuvien suunnittelun lähtötietojen keräämiseen.

## Teknologiapino

- **Backend**: Node.js + Express (TypeScript)
- **Frontend**: React + TypeScript + Vite
- **Tietokanta**: PostgreSQL
- **Tiedostotallennus**: Paikallinen (kehitys), AWS S3 (tuotanto)
- **Containerointi**: Docker + Docker Compose

## Kehitysympäristö

### Vaatimukset

- Docker ja Docker Compose
- Node.js 20+ (vain jos haluat ajaa ilman Dockeria)

### Käynnistäminen

1. Kloonaa repositorio
2. Kopioi `.env.example` tiedostot:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Aseta sähköpostipalvelun ympäristömuuttujat (Resend):
   ```bash
   export RESEND_API_KEY="your_resend_api_key_here"
   export RESEND_FROM_EMAIL="onboarding@resend.dev"  # Vapaaehtoinen (kehitys)
   export RESEND_TEST_EMAIL="your-email@gmail.com"  # Vapaaehtoinen (kehitys)
   export FRONTEND_URL="http://localhost:3000"  # Vapaaehtoinen
   ```
   
   **Huom**: 
   - Kehitysvaiheessa käytetään Resendin oletusdomainia (`onboarding@resend.dev`), joka toimii ilman domain-vahvistusta.
   - Resendin testitilassa voi lähettää sähköpostia vain API-avaimen rekisteröityyn osoitteeseen. Aseta `RESEND_TEST_EMAIL` API-avaimen rekisteröityyn osoitteeseen (esim. `markku.seppala@gmail.com`), jotta kaikki sähköpostit ohjataan tähän osoitteeseen kehitysympäristössä.
   - Tuotannossa täytyy vahvistaa oma domain Resendissä ja asettaa `RESEND_FROM_EMAIL` esim. `noreply@sievitalo.fi`.
   
   Vaihtoehtoisesti voit luoda `.env` tiedoston projektin juureen ja lisätä muuttujat sinne.
4. Käynnistä Docker-ympäristö:
   ```bash
   docker-compose up
   ```

Sovellus on saatavilla:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432

### Tietokantamigraatiot

Tietokantamigraatiot ajetaan automaattisesti ensimmäisellä käynnistyksellä. Vaihtoehtoisesti voit ajaa ne manuaalisesti:

```bash
docker-compose exec backend npm run migrate:up
```

### Ensimmäinen käyttäjä

Luo ensimmäinen admin-käyttäjä skriptillä:

```bash
# Luo admin-käyttäjä oletusarvoilla (admin@sievitalo.fi / admin123)
docker-compose exec backend npm run create-admin

# Tai määritä email ja salasana
docker-compose exec backend npm run create-admin markku.seppala@sievitalo.fi salasana123
```

Kun admin-käyttäjä on luotu, voit kirjautua sisään ja luoda muita käyttäjiä (edustaja, suunnittelija, admin) käyttöliittymän kautta tai API:n kautta:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "edustaja@example.com",
    "password": "salasana",
    "role": "edustaja"
  }'
```

## Projektirakenne

```
.
├── backend/          # Backend API
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── index.ts
│   ├── migrations/
│   └── Dockerfile
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.tsx
│   └── Dockerfile
└── docker-compose.yml
```

## API-reitit

### Autentikointi
- `POST /api/auth/login` - Kirjaudu sisään
- `POST /api/auth/register` - Rekisteröidy (kehitys)

### Asiakkaat (vaatii autentikoinnin)
- `GET /api/customers` - Listaa asiakkaat
- `POST /api/customers` - Luo uusi asiakas (vain edustaja)
- `GET /api/customers/:token` - Hae asiakas tokenilla

### Lomake (julkinen)
- `GET /api/form/:token` - Hae lomakkeen tiedot
- `POST /api/form/:token/save` - Tallenna luonnos
- `POST /api/form/:token/submit` - Lähetä lomake

### Vastaukset (vaatii autentikoinnin)
- `GET /api/submissions` - Listaa vastaukset
- `GET /api/submissions/:id` - Hae vastaus
- `GET /api/submissions/:id/pdf` - Vie PDF:ksi

## Roolit

- **Edustaja**: Luo asiakastunnuksia, täyttää lomakkeita, tarkastelee vastauksia
- **Suunnittelija**: Tarkastelee vastauksia (vain luku)
- **Asiakas**: Täyttää lomakkeen tokenilla (ei kirjautumista)

## Tuotantoon siirto Renderiin

### 1. Render-palvelut

Projekti käyttää `render.yaml` tiedostoa, joka määrittelee kaikki tarvittavat palvelut:
- PostgreSQL-tietokanta
- Backend Web Service
- Frontend Web Service

### 2. Ympäristömuuttujat Renderissä

#### Backend-palvelu

Aseta seuraavat ympäristömuuttujat Renderin dashboardissa backend-palvelulle:

**Pakolliset:**
- `JWT_SECRET` - Vahva salaisuus JWT-tokenien allekirjoitukseen (esim. generoi: `openssl rand -base64 32`)
  - **TÄRKEÄÄ:** Jos tämä puuttuu tai on eri kuin kehitysympäristössä, tokenit eivät toimi. Käyttäjien täytyy kirjautua uudelleen tuotannossa.
- `FRONTEND_URL` - Frontend-palvelun URL Renderissä (esim. `https://lahtotiedot-frontend.onrender.com`)
- `RESEND_API_KEY` - Resend API-avain sähköpostien lähettämiseen
- `RESEND_FROM_EMAIL` - Lähettäjän sähköpostiosoite (vahvistettu domain, esim. `noreply@sievitalo.fi`)

**Vapaaehtoiset:**
- `RESEND_TEST_EMAIL` - Testauskäyttöön (ohjaa kaikki sähköpostit tähän osoitteeseen)
  - **Tärkeää:** Jos käytät Resendin testitilaa (ei vahvistettua domainia), aseta tämä API-avaimen rekisteröityyn osoitteeseen (esim. `markku.seppala@gmail.com`). Tämä toimii myös tuotannossa, jos käytät testitilaa.

**Automaattisesti asetettavat:**
- `DATABASE_URL` - Asetetaan automaattisesti PostgreSQL-palvelusta
- `PORT` - Asetetaan automaattisesti Renderissä (3001)
- `NODE_ENV` - Asetetaan automaattisesti `production`
- `UPLOAD_DIR` - Asetettu `/tmp/uploads` (ephemeral, harkitse S3:ta tuotannossa)

#### Frontend-palvelu

Aseta seuraava ympäristömuuttuja frontend-palvelulle:

- `VITE_API_URL` - Backend-palvelun URL Renderissä (esim. `https://lahtotiedot-backend.onrender.com`)

### 3. Deploy-prosessi

1. Pushaa koodi GitHubiin
2. Yhdistä GitHub-repositorio Renderiin
3. Render lukee `render.yaml` tiedoston ja luo palvelut automaattisesti
4. Aseta ympäristömuuttujat Renderin dashboardissa (katso yllä)
5. Tietokantamigraatiot ajetaan automaattisesti backendin ensimmäisellä käynnistyksellä

### 4. Ensimmäinen käyttäjä

Kun palvelut ovat käynnissä, luo ensimmäinen admin-käyttäjä Renderin shell-konsolissa:

```bash
# Renderin dashboardissa: Backend-palvelu > Shell
npm run create-admin admin@sievitalo.fi salasana123
```

### 5. Tiedostotallennus

**Huomio:** Renderin filesystem on ephemeral (väliaikainen). Tiedostot katoavat palvelun uudelleenkäynnistyksessä. Tuotannossa suositellaan:

- AWS S3 -tallennusta tiedostoille
- Tietokantaan tallennusta pienten tiedostojen osalta

### 6. CORS-asetukset

Backend on konfiguroitu sallimaan pyynnöt `FRONTEND_URL` ympäristömuuttujassa määritellyltä domainilta. Varmista, että `FRONTEND_URL` on asetettu oikein backend-palvelussa.




