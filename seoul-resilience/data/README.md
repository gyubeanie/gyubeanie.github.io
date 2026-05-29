# Seoul resilience data notes

This prototype uses static boundary files copied from the open `southkorea/seoul-maps` dataset:

- `seoul_neighborhoods_geo_simple.json`
- `seoul_municipalities_geo_simple.json`

The current UI is a visual and analytical MVP. Readiness values are client-side stress-test mock indicators, not official forecasts or operational assessments.

v0.2 static-refresh structure:

1. Store API keys as GitHub Secrets:
   - `SEOUL_OPEN_DATA_KEY`
   - `KMA_APIHUB_KEY`
   - `DATA_GO_KR_KEY`
2. Run `.github/workflows/update-seoul-resilience-data.yml` hourly or manually.
3. Fetch public Korean API data server-side in the workflow using `.github/scripts/update-seoul-resilience-data.py`.
4. Normalize and aggregate rainfall/river status into `seoul-live.json`.
5. Commit/publish redacted static JSON snapshots for GitHub Pages.

Current GitHub connection:

- The repository remote is `https://github.com/gyubeanie/gyubeanie.github.io.git`.
- The dashboard route is `/seoul-resilience/`.
- The hourly workflow is already present at `.github/workflows/update-seoul-resilience-data.yml`.
- The live card will show "설정 필요" until `SEOUL_OPEN_DATA_KEY` is added under repository Settings -> Secrets and variables -> Actions -> Repository secrets, then the workflow is run once from the Actions tab.

Target data families:

- Seoul Open Data Plaza: water supply, emergency water, traffic speeds, logistics and market data, real-time city data.
- KMA APIHub: warnings, forecasts, climate/weather stress indicators.
- Public Data Portal / MOIS: civil-defense shelters, emergency/public-safety assets.

Public version security posture:

- Prefer aggregated neighborhood/district indicators.
- Avoid exact critical-grid topology and single-point-of-failure modeling.
- Use public, defensive, preparedness-oriented framing.
