# GPX Route Services

Webbapp för motorcykelresor där du laddar upp en GPX-fil och visar rutten på en OpenStreetMap-karta. Appen hittar bensinstationer, boenden, campingplatser och restauranger längs rutten.

## Funktioner

- GPX-uppladdning via webbläsaren
- ruttvisning med Leaflet och OpenStreetMap tiles
- valbar sökkorridor på 2, 5, 10 eller 20 km längs rutten
- dagsetapper, exempelvis 250 km per dag
- förslag på bensinstopp och boenden nära varje etappslut
- POI-hämtning från Overpass API
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

## Projektstruktur

```text
app/main.py          FastAPI-app, GPX-parsning, Overpass-fråga och geometri
templates/index.html Startsida och grundlayout
static/app.js        Leaflet-karta, uppladdning, filter och resultatlista
static/styles.css    Responsiv layout och komponentstilar
requirements.txt     Python-beroenden
```
