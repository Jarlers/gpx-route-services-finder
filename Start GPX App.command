#!/bin/zsh
cd /Users/bjornjungwallius/gpx-app || exit 1

if [ ! -d ".venv" ]; then
  python3 -m venv .venv || exit 1
fi

source .venv/bin/activate

if ! python -c "import fastapi, uvicorn, gpxpy, httpx, shapely, pyproj, jinja2" >/dev/null 2>&1; then
  pip install -r requirements.txt || exit 1
fi

open http://127.0.0.1:8000
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
