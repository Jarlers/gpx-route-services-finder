# GPX Route Services

Webbapp för motorcykelresor där du laddar upp en GPX-fil och visar rutten på en OpenStreetMap-karta. Appen hittar bensinstationer, boenden, campingplatser och restauranger längs rutten.

## Funktioner

- GPX-uppladdning via webbläsaren
- klickbaserad ruttbyggare i kartan
- GPX-export av den routade linjen
- ruttvisning med Leaflet och OpenStreetMap tiles
- valbar sökkorridor på 2, 5, 10 eller 20 km längs rutten
- dagsetapper, exempelvis 250 km per dag
- förslag på bensinstopp och boenden nära varje etappslut
- POI-hämtning från Overpass API
- bilrouting via OSRM
- vandringsleder via Overpass API
- symbolmarkörer på kartan och lista i sidopanelen
- filter för bensin, boende, camping och mat
- sortering efter ungefärligt avstånd från start längs rutten
- Google Maps-länk för varje träff

## Kör lokalt

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Öppna sedan `http://127.0.0.1:8000`.

## Datakällor

Appen använder Overpass API för att hämta OpenStreetMap-objekt:

- `amenity=fuel`
- `tourism=hotel`
- `tourism=guest_house`
- `tourism=camp_site`
- `amenity=restaurant`
- `route=hiking`
- `highway=path|footway|track` med `sac_scale` eller `trail_visibility`

Ruttbyggaren använder OSRM via server-API:t `/api/route`. Som standard används publik OSRM för bil/väg. Vandringsrouting är förberedd via `OSRM_HIKING_BASE_URL` och kräver en OSRM-instans med foot/hiking-profil för att rutten ska kunna följa leder automatiskt. Om sådan motor saknas visas ett tydligt fel i UI:t.

## Projektstruktur

```text
app/main.py          FastAPI-app, GPX-parsning, Overpass-fråga och geometri
app/routing.py       Routingproxy och vandringsledshämtning
templates/index.html Startsida och grundlayout
static/app.js        Leaflet-karta, uppladdning, filter och resultatlista
static/route-utils.js GPX-export och ruttsegmentsammanslagning
static/styles.css    Responsiv layout och komponentstilar
requirements.txt     Python-beroenden
```
