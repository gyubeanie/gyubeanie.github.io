# Boussole - France-first MICHELIN Guide compass

An unofficial prototype web app that behaves like a compass: choose your
position, filter MICHELIN Guide distinctions, and follow the arrow toward the
nearest matching restaurant.

> **Important data note:** this repository ships with a deliberately small
> demonstrator dataset. It is not a complete or live MICHELIN Guide feed. For a
> production launch, replace `data/restaurants.france.sample.json` with
> licensed/current restaurant data that you are allowed to use.

## Run locally

```bash
node server.js
```

Then open the URL shown in the terminal, usually:

```text
http://localhost:5173
```

You can also use any static web server. Avoid opening `index.html` directly from
the filesystem because browsers may block the JSON fetch.

## Features

- France-first dataset and city presets.
- Browser geolocation support.
- Optional live device compass via `DeviceOrientationEvent`.
- Filters for:
  - 3 MICHELIN Stars
  - 2 MICHELIN Stars
  - 1 MICHELIN Star
  - Bib Gourmand
  - Guide selected restaurants
  - optional sustainable / legacy Green Star tag field
- Nearest-match compass needle, bearing, distance, top nearby matches, and
  Google Maps directions links.
- JSON import so you can test richer datasets without changing code.

## Data schema

The app accepts either an array of restaurants or an object with a
`restaurants` array:

```json
{
  "metadata": {
    "country": "France",
    "status": "your-data-status",
    "lastUpdated": "2026-05-27"
  },
  "restaurants": [
    {
      "id": "unique-id",
      "name": "Restaurant name",
      "city": "Paris",
      "region": "Île-de-France",
      "address": "Street address",
      "latitude": 48.8566,
      "longitude": 2.3522,
      "distinction": "3-stars",
      "greenStar": false,
      "googlePlaceId": "optional-google-place-id",
      "cuisine": "Creative",
      "michelinUrl": "https://guide.michelin.com/..."
    }
  ]
}
```

Valid `distinction` values:

- `3-stars`
- `2-stars`
- `1-star`
- `bib-gourmand`
- `selected`

## Live France data

`config.js` controls data loading:

```js
window.BOUSSOLE_CONFIG = {
  dataUrl: "./data/restaurants.france.sample.json",
  liveDataUrl: "./data/michelin-france.live.json",
  googleMapsApiKey: ""
};
```

Set `liveDataUrl` to a licensed/current CORS-enabled JSON endpoint, or to a
file committed in this repo such as:

```js
liveDataUrl: "./data/michelin-france.live.json"
```

The included GitHub Actions workflow at
`.github/workflows/update-restaurant-feed.yml` can refresh that JSON file daily
from a licensed endpoint stored as the repository secret `MICHELIN_FEED_URL`.
Until that file exists, the app falls back to the bundled sample dataset.

GitHub Pages is static, so it cannot safely hide credentials or run a private
server-side Michelin connector. If your data provider requires secrets, put the
connector on a backend you control and expose only the sanitized JSON feed to
this app.

## Google Maps reviews

Every restaurant has an "Open reviews" link that searches Google Maps.

To show embedded Google Maps review snippets inside the app:

1. Create a Google Maps Platform browser key.
2. Enable Maps JavaScript API and Places.
3. Restrict the key by HTTP referrer, for example:
   - `https://gyubeanie.github.io/*`
   - `http://localhost:5173/*` for local testing
4. Add it to `config.js`:

```js
googleMapsApiKey: "YOUR_RESTRICTED_BROWSER_KEY"
```

For best matching and lower Places lookup ambiguity, include `googlePlaceId` in
your restaurant feed.

## GitHub Pages

This app is static and can run directly from the root of
`gyubeanie.github.io`. The Node server is only for local development.

## Production checklist

1. Secure permission/licensing for the restaurant dataset.
2. Add a recurring ingestion/update workflow for France.
3. Validate every restaurant has accurate coordinates.
4. Add a backend if you need private API keys, data freshness checks, or
   account-specific saved filters.
5. Deploy over HTTPS. Geolocation and device orientation are restricted or
   permission-gated in many browsers unless the page is secure.
6. Add offline caching only after you have a clear data refresh policy.

## Trademark / affiliation

This is an unofficial prototype. MICHELIN, MICHELIN Guide, MICHELIN Stars, and
Bib Gourmand are owned by their respective trademark holders. Do not present the
app as affiliated with or endorsed by Michelin unless you have permission.
