window.BOUSSOLE_CONFIG = {
  /**
   * Static fallback data bundled with this repo.
   * Replace only if you want the bundled demo to point elsewhere.
   */
  dataUrl: "./data/restaurants.france.sample.json",

  /**
   * Optional licensed/current France feed.
   *
   * GitHub Pages is static, so this must be a CORS-enabled JSON endpoint or a
   * JSON file in this repository, for example:
   *   "./data/michelin-france.live.json"
   *   "https://your-domain.example/michelin/france/restaurants.json"
   *
   * The default tries the scheduled GitHub Actions output first. If that file
   * does not exist yet, the app falls back to dataUrl.
   */
  liveDataUrl: "./data/michelin-france.live.json",

  /**
   * Optional Google Maps JavaScript API key with Places enabled.
   * Restrict it to https://gyubeanie.github.io/* in Google Cloud before
   * publishing. If blank, the app still links out to Google Maps reviews.
   */
  googleMapsApiKey: "",
  googleMapsLanguage: "en",
  googleMapsRegion: "FR",
};
