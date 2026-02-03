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
3. Aseta sähköpostipalvelun ympäristömuuttujat (Gmail SMTP):
   ```bash
   export SMTP_HOST="smtp.gmail.com"
   export SMTP_PORT="587"
   export SMTP_USER="oma.nimi@gmail.com"
   export SMTP_PASSWORD="<Gmail App Password>"
   export EMAIL_FROM="oma.nimi@gmail.com"
   export FRONTEND_URL="http://localhost:3000"  # Vapaaehtoinen
   ```
   
   **Huom**: `SMTP_PASSWORD` on Googlen App Password, ei tavallinen Gmail-salasana. Luo App Password: Google-tili > Turvallisuus > 2-vaiheinen vahvistus > Sovellus salasanat. Ei domain-vahvistusta tarvita; viestit voi lähettää mihin tahansa vastaanottajaan (esim. @sievitalo.fi).
   
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
- `SMTP_USER` - Gmail-osoite (esim. `oma.nimi@gmail.com`)
- `SMTP_PASSWORD` - Gmail App Password (ei tavallinen salasana; luo Google-tilillä Sovellus salasanat)
- `EMAIL_FROM` - Lähettäjän sähköpostiosoite (esim. sama kuin SMTP_USER)

**Vapaaehtoiset (sähköposti):**
- `SMTP_HOST` - Oletus `smtp.gmail.com`
- `SMTP_PORT` - Oletus `587` (STARTTLS)

**AWS S3 (suositeltu tuotannossa):**
- `AWS_REGION` - AWS-alue (esim. `eu-north-1`, `us-east-1`)
- `AWS_ACCESS_KEY_ID` - AWS IAM-käyttäjän access key ID
- `AWS_SECRET_ACCESS_KEY` - AWS IAM-käyttäjän secret access key
- `AWS_S3_BUCKET_NAME` - S3-bucketin nimi (esim. `lahtotiedot-files`)
- `AWS_S3_PUBLIC_URL` - (Vapaaehtoinen) Julkinen URL bucketille, jos bucket on julkinen (esim. `https://lahtotiedot-files.s3.eu-north-1.amazonaws.com`). Jos ei asetettu, käytetään presigned URL:ia.

**Automaattisesti asetettavat:**
- `DATABASE_URL` - Asetetaan automaattisesti PostgreSQL-palvelusta
- `PORT` - Asetetaan automaattisesti Renderissä (3001)
- `NODE_ENV` - Asetetaan automaattisesti `production`
- `UPLOAD_DIR` - Asetettu `/tmp/uploads` (käytetään vain jos S3 ei ole konfiguroitu)

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

**Huomio:** Renderin filesystem on ephemeral (väliaikainen). Tiedostot katoavat palvelun uudelleenkäynnistyksessä. 

**AWS S3 -konfiguraatio (suositeltu tuotannossa):**

1. Luo AWS S3 bucket:
   - Mene AWS Console > S3
   - Luo uusi bucket (esim. `lahtotiedot-files`)
   - Valitse sopiva alue (esim. `eu-north-1`)
   - **Tärkeää:** Jos haluat käyttää presigned URL:ia (suositeltu), bucketin ei tarvitse olla julkinen. Jos haluat käyttää julkista URL:ia, konfiguroi bucket CORS-asetukset.

2. Luo IAM-käyttäjä S3:lle:
   - Mene AWS Console > IAM > Users
   - Luo uusi käyttäjä (esim. `lahtotiedot-s3-user`)
   - Liitä käyttäjälle seuraava policy (korvaa `YOUR-BUCKET-NAME`):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
       }
     ]
   }
   ```
   - Luo Access Key käyttäjälle ja tallenna `AWS_ACCESS_KEY_ID` ja `AWS_SECRET_ACCESS_KEY`

3. Aseta ympäristömuuttujat Renderissä (katso yllä "AWS S3" -osio)

**Fallback:** Jos S3-ympäristömuuttujat eivät ole asetettu, sovellus käyttää paikallista filesystemia (`UPLOAD_DIR`). Tämä toimii kehitysympäristössä, mutta **ei tuotannossa Renderissä** (tiedostot katoavat).

### 6. CORS-asetukset

Backend on konfiguroitu sallimaan pyynnöt `FRONTEND_URL` ympäristömuuttujassa määritellyltä domainilta. Varmista, että `FRONTEND_URL` on asetettu oikein backend-palvelussa.




