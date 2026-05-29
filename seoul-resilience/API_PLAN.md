# 서울 2050 기후안보 회복력 상황판 API plan

## Current v0.2 data pipeline

The app is static GitHub Pages. API keys must not be exposed in browser JavaScript.

Current pattern:

1. GitHub Actions reads `SEOUL_OPEN_DATA_KEY`.
2. `.github/scripts/update-seoul-resilience-data.py` calls Seoul Open Data server-side.
3. The workflow writes `seoul-resilience/data/seoul-live.json`.
4. The browser app reads the redacted static JSON snapshot only.

Activation checklist:

1. Add `SEOUL_OPEN_DATA_KEY` in GitHub repository Settings -> Secrets and variables -> Actions.
2. Open Actions -> "Update Seoul resilience data" -> "Run workflow" once.
3. Confirm that `seoul-resilience/data/seoul-live.json` receives a bot commit with a non-null `generated_at`.
4. Keep the hourly schedule enabled for GitHub Pages refreshes.

Initial Seoul Open Data services:

- `ListRainfallService`: rainfall signal for flood/logistics stress context.
- `ListRiverStageService`: river-stage signal for flood/access stress context.

These live feeds are not yet used as hard operational assessments; they are displayed as source-status and context signals.

## KMA APIHub APIs to apply for next

For this dashboard, the first KMA APIHub products should be:

1. **기상특보**
   - Purpose: Seoul-area heavy-rain, heatwave, cold-wave, strong-wind warning context.
   - Dashboard role: scenario context and warning banner, not tactical advice.

2. **초단기실황 / 초단기예보**
   - Purpose: observed/very-short-range precipitation, temperature, wind, humidity.
   - Dashboard role: near-real-time hazard context for rain/heat stress.

3. **단기예보**
   - Purpose: 1–3 day forecast window for heat/rain stress.
   - Dashboard role: forward-looking pressure context for movement, power, water, and civil defence.

Later-stage KMA candidates:

4. **중기예보 / 중기기온·강수확률**
   - Purpose: planning context beyond the immediate forecast.

5. **기후변화 시나리오 / 극한기후지수 data**
   - Purpose: official 2050 scenario anchors for heatwave days, tropical nights, heavy precipitation indices.
   - Use for narrative/scenario calibration, not exact facility-level prediction.

6. **산업특화 에너지·수자원 weather products**, if available to your APIHub account
   - Purpose: better proxies for electricity demand stress and water-supply stress.

## Security posture

Keep public GitHub Pages output defensive and aggregated:

- show district/neighborhood/grid preparedness bands;
- show rainfall/water-level/weather context;
- avoid exact power-grid topology;
- avoid single-point-of-failure chains;
- avoid tactical interdiction or targeting logic.
