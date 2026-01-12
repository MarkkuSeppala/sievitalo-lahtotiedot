# Docker-palveluiden käyttöohje

Tämä dokumentti kertoo, miten palvelun eri osat käynnistetään ja suljetaan Docker-ympäristössä.

## Palvelut

Projektissa on kolme pääpalvelua:

1. **postgres** - PostgreSQL-tietokanta (portti 5432)
2. **backend** - Node.js/Express backend API (portti 3001)
3. **frontend** - React frontend (portti 3000)

## Käynnistäminen

### Kaikki palvelut kerralla

Käynnistä kaikki palvelut taustalla:

```bash
docker-compose up -d
```

Käynnistä kaikki palvelut etualalla (näet lokitiedot):

```bash
docker-compose up
```

Käynnistä ja rakenna uudelleen (jos Dockerfile on muuttunut):

```bash
docker-compose up --build
```

### Yksittäiset palvelut

Käynnistä vain tietokanta:

```bash
docker-compose up postgres
```

Käynnistä tietokanta ja backend:

```bash
docker-compose up postgres backend
```

Käynnistä tietokanta taustalla ja backend etualalla:

```bash
docker-compose up -d postgres
docker-compose up backend
```

## Sammuttaminen

### Kaikki palvelut

Sammuta kaikki palvelut:

```bash
docker-compose down
```

Sammuta ja poista myös volyymit (tietokantatiedot poistetaan):

```bash
docker-compose down -v
```

Sammuta ja poista myös kuvat:

```bash
docker-compose down --rmi all
```

### Yksittäiset palvelut

Sammuta yksittäinen palvelu:

```bash
docker-compose stop frontend
docker-compose stop backend
docker-compose stop postgres
```

Käynnistä uudelleen yksittäinen palvelu:

```bash
docker-compose start frontend
docker-compose start backend
docker-compose start postgres
```

Käynnistä uudelleen ja rakenna:

```bash
docker-compose up -d --build frontend
```

## Tilan tarkistaminen

Näytä käynnissä olevat palvelut:

```bash
docker-compose ps
```

Näytä kaikki palvelut (myös pysähtyneet):

```bash
docker-compose ps -a
```

## Lokitiedot

Näytä kaikkien palveluiden lokit:

```bash
docker-compose logs
```

Näytä yksittäisen palvelun lokit:

```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

Seuraa lokitiedostoja reaaliajassa (päivittyy automaattisesti):

```bash
docker-compose logs -f
```

Seuraa yksittäisen palvelun lokitiedostoja:

```bash
docker-compose logs -f backend
```

Näytä viimeiset 100 riviä:

```bash
docker-compose logs --tail=100 backend
```

## Uudelleenrakentaminen

Rakenna palvelu uudelleen (jos Dockerfile on muuttunut):

```bash
docker-compose build backend
docker-compose build frontend
```

Rakenna uudelleen ilman välimuistia:

```bash
docker-compose build --no-cache backend
```

Rakenna ja käynnistä uudelleen:

```bash
docker-compose up -d --build backend
```

## Pysäyttäminen ja jatkaminen

Pysäytä palvelu (säilyttää tilan):

```bash
docker-compose pause backend
```

Jatka pysäytettyä palvelua:

```bash
docker-compose unpause backend
```

## Konttien hallinta

Käynnistä uudelleen yksittäinen kontti:

```bash
docker-compose restart backend
```

Pysäytä kontti:

```bash
docker-compose stop backend
```

Poista kontti (sammuttaa ensin):

```bash
docker-compose rm backend
```

Poista kontti pakottamalla (ei odota sammutusta):

```bash
docker-compose rm -f backend
```

## Konttien sisällä olevat komennot

Aja komento backend-kontissa:

```bash
docker-compose exec backend npm run migrate:up
docker-compose exec backend npm run create-admin
```

Aja interaktiivinen shell backend-kontissa:

```bash
docker-compose exec backend sh
```

Aja komento tietokantakontissa:

```bash
docker-compose exec postgres psql -U lahtotiedot -d lahtotiedot
```

## Siivoaminen

Poista pysähtyneet kontit:

```bash
docker-compose rm
```

Poista käyttämättömät volyymit:

```bash
docker volume prune
```

Poista kaikki projektin volyymit:

```bash
docker-compose down -v
```

Poista käyttämättömät kuvat:

```bash
docker image prune
```

## Yleisiä käyttötapauksia

### Ensimmäinen käynnistys

```bash
# 1. Käynnistä kaikki palvelut
docker-compose up -d

# 2. Odota, että palvelut ovat valmiit (tarkista lokit)
docker-compose logs -f

# 3. Aja tietokantamigraatiot (jos tarvitaan)
docker-compose exec backend npm run migrate:up

# 4. Luo ensimmäinen admin-käyttäjä
docker-compose exec backend npm run create-admin
```

### Kehitystyöskentely

```bash
# Käynnistä taustalla
docker-compose up -d

# Seuraa backend-lokeja
docker-compose logs -f backend

# Toisessa terminaalissa: seuraa frontend-lokeja
docker-compose logs -f frontend
```

### Palvelun uudelleenkäynnistys muutosten jälkeen

```bash
# Jos backend-koodia on muutettu (ei Dockerfile)
docker-compose restart backend

# Jos Dockerfile on muutettu
docker-compose up -d --build backend
```

### Täysi reset (poistaa kaiken datan)

```bash
# Sammuta ja poista kaikki
docker-compose down -v

# Käynnistä uudelleen
docker-compose up -d
```

### Ongelmien vianetsintä

```bash
# Tarkista palvelujen tila
docker-compose ps

# Tarkista backend-lokit
docker-compose logs backend

# Tarkista tietokantayhteys
docker-compose exec backend npm run migrate:up

# Käynnistä backend uudelleen
docker-compose restart backend
```

## Portit

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432

## Huomioita

- Tietokantatiedot säilyvät volyymissa `postgres_data`, joten ne eivät katoa konttien sammutuksen yhteydessä
- Jos haluat aloittaa puhtaalta pöydältä, käytä `docker-compose down -v` (poistaa kaikki volyymit)
- Backend ja frontend käyttävät volume-mountteja, joten koodimuutokset näkyvät automaattisesti ilman uudelleenrakennusta
- Jos `node_modules` eivät toimi oikein, voit poistaa volyymin: `docker volume rm lahtotiedot_backend_node_modules`





