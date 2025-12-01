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
3. Käynnistä Docker-ympäristö:
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

Luo ensimmäinen käyttäjä (edustaja tai suunnittelija) API:n kautta:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
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

## Tuotantoon siirto

1. Konfiguroi ympäristömuuttujat Renderissä
2. Aseta S3-credentials tiedostotallennukseen
3. Aja tietokantamigraatiot
4. Deploy Renderiin

