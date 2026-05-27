const CONFIG = window.BOUSSOLE_CONFIG ?? {};
const FALLBACK_DATA_URL = "./data/restaurants.france.sample.json";
const DATA_URL = CONFIG.dataUrl || FALLBACK_DATA_URL;
const LIVE_DATA_URL = CONFIG.liveDataUrl || "";

const DISTINCTION_LABELS = {
  "3-stars": "3-star MICHELIN",
  "2-stars": "2-star MICHELIN",
  "1-star": "1-star MICHELIN",
  "bib-gourmand": "Bib Gourmand",
  selected: "Guide selected",
};

const STAR_WEIGHT = {
  "3-stars": 0.82,
  "2-stars": 0.9,
  "1-star": 0.96,
  "bib-gourmand": 1,
  selected: 1.02,
};

const QUICK_LOCATIONS = {
  paris: { label: "Paris", latitude: 48.8566, longitude: 2.3522 },
  lyon: { label: "Lyon", latitude: 45.764, longitude: 4.8357 },
  marseille: { label: "Marseille", latitude: 43.2965, longitude: 5.3698 },
  bordeaux: { label: "Bordeaux", latitude: 44.8378, longitude: -0.5792 },
  nice: { label: "Nice", latitude: 43.7102, longitude: 7.262 },
  strasbourg: { label: "Strasbourg", latitude: 48.5734, longitude: 7.7521 },
};

const state = {
  restaurants: [],
  metadata: {},
  dataSource: "sample",
  userPosition: {
    label: "Paris",
    latitude: QUICK_LOCATIONS.paris.latitude,
    longitude: QUICK_LOCATIONS.paris.longitude,
  },
  heading: null,
  hasLiveHeading: false,
  activeQuickLocation: "paris",
  currentTarget: null,
};

const googleReviewsCache = new Map();
let googleMapsPromise = null;
let placesService = null;

const els = {
  dataCount: document.querySelector("#data-count"),
  feedStatus: document.querySelector("#feed-status"),
  useLocation: document.querySelector("#use-location"),
  enableHeading: document.querySelector("#enable-heading"),
  mobileOptionsToggle: document.querySelector("#mobile-options-toggle"),
  mobileListToggle: document.querySelector("#mobile-list-toggle"),
  locationStatus: document.querySelector("#location-status"),
  manualForm: document.querySelector("#manual-form"),
  latitude: document.querySelector("#latitude"),
  longitude: document.querySelector("#longitude"),
  greenOnly: document.querySelector("#green-only"),
  preferStars: document.querySelector("#prefer-stars"),
  dataFile: document.querySelector("#data-file"),
  resetFilters: document.querySelector("#reset-filters"),
  filterInputs: [...document.querySelectorAll('input[name="distinction"]')],
  quickLocationButtons: [...document.querySelectorAll("[data-location]")],
  needle: document.querySelector("#needle"),
  targetName: document.querySelector("#target-name"),
  targetMeta: document.querySelector("#target-meta"),
  targetDistance: document.querySelector("#target-distance"),
  targetBearing: document.querySelector("#target-bearing"),
  matchCount: document.querySelector("#match-count"),
  directionsLink: document.querySelector("#directions-link"),
  guideLink: document.querySelector("#guide-link"),
  reviewsButton: document.querySelector("#reviews-button"),
  mapsReviewsLink: document.querySelector("#maps-reviews-link"),
  reviewsPanel: document.querySelector("#reviews-panel"),
  nearbyList: document.querySelector("#nearby-list"),
  headingMode: document.querySelector("#heading-mode"),
};

async function init() {
  bindEvents();
  await loadData();
  syncManualFields();
  render();
}

function bindEvents() {
  els.useLocation.addEventListener("click", requestLocation);
  els.enableHeading.addEventListener("click", requestHeading);
  els.mobileOptionsToggle.addEventListener("click", toggleMobileOptions);
  els.mobileListToggle.addEventListener("click", toggleMobileList);
  els.manualForm.addEventListener("submit", handleManualPosition);
  els.greenOnly.addEventListener("change", render);
  els.preferStars.addEventListener("change", render);
  els.resetFilters.addEventListener("click", resetFilters);
  els.dataFile.addEventListener("change", handleDataFile);
  els.reviewsButton.addEventListener("click", showGoogleReviews);

  for (const input of els.filterInputs) {
    input.addEventListener("change", render);
  }

  for (const button of els.quickLocationButtons) {
    button.addEventListener("click", () => {
      const key = button.dataset.location;
      const location = QUICK_LOCATIONS[key];
      setUserPosition({ ...location }, `Using ${location.label} as your position.`);
      state.activeQuickLocation = key;
      render();
    });
  }

  window.addEventListener("deviceorientationabsolute", handleOrientation, true);
  window.addEventListener("deviceorientation", handleOrientation, true);
}

async function loadData() {
  const candidates = [
    LIVE_DATA_URL
      ? {
          url: LIVE_DATA_URL,
          source: "live",
          label: "configured live feed",
        }
      : null,
    {
      url: DATA_URL,
      source: DATA_URL === FALLBACK_DATA_URL ? "sample" : "configured",
      label: DATA_URL === FALLBACK_DATA_URL ? "bundled sample data" : "configured data",
    },
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const payload = await fetchJson(candidate.url);
      applyDataset(payload, candidate.source, candidate.url);
      setFeedStatus(candidate);
      return;
    } catch (error) {
      console.warn(`Could not load ${candidate.label}`, error);
    }
  }

  els.locationStatus.textContent =
    "Could not load restaurant data. Check config.js or import a JSON file.";
  applyDataset({ metadata: { status: "empty" }, restaurants: [] }, "empty", "");
  setFeedStatus({ source: "empty", label: "empty dataset", url: "" });
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${url}: ${response.status}`);
  }
  return response.json();
}

function setFeedStatus(candidate) {
  if (!els.feedStatus) {
    return;
  }

  const count = state.restaurants.length.toLocaleString();
  const status = state.metadata.status || candidate.source;
  const updated = state.metadata.lastUpdated
    ? ` Updated ${state.metadata.lastUpdated}.`
    : "";

  if (candidate.source === "live") {
    els.feedStatus.textContent = `Using live France feed: ${count} restaurants. ${status}.${updated}`;
    return;
  }

  if (candidate.source === "sample") {
    els.feedStatus.textContent = `Using bundled sample data: ${count} restaurants. Configure liveDataUrl in config.js for a complete licensed France feed.${updated}`;
    return;
  }

  els.feedStatus.textContent = `Using configured data: ${count} restaurants. ${status}.${updated}`;
}

function applyDataset(payload, source = "imported", sourceUrl = "") {
  const restaurants = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.restaurants)
      ? payload.restaurants
      : [];

  state.metadata = payload.metadata ?? {};
  state.dataSource = source;
  state.sourceUrl = sourceUrl;
  state.restaurants = restaurants
    .filter(isValidRestaurant)
    .map((restaurant) => ({
      ...restaurant,
      latitude: Number(restaurant.latitude),
      longitude: Number(restaurant.longitude),
      greenStar: Boolean(restaurant.greenStar),
      googlePlaceId: restaurant.googlePlaceId || restaurant.placeId || "",
    }));
}

function isValidRestaurant(restaurant) {
  return (
    restaurant &&
    restaurant.name &&
    restaurant.distinction &&
    Number.isFinite(Number(restaurant.latitude)) &&
    Number.isFinite(Number(restaurant.longitude)) &&
    Math.abs(Number(restaurant.latitude)) <= 90 &&
    Math.abs(Number(restaurant.longitude)) <= 180
  );
}

function handleDataFile(event) {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      applyDataset(JSON.parse(reader.result), "imported", file.name);
      els.locationStatus.textContent = `Loaded ${state.restaurants.length.toLocaleString()} restaurants from ${file.name}.`;
      setFeedStatus({ source: "imported", label: file.name, url: file.name });
      render();
    } catch (error) {
      console.error(error);
      els.locationStatus.textContent =
        "That JSON could not be parsed. Check the sample schema and try again.";
    }
  });
  reader.readAsText(file);
}

function requestLocation() {
  if (!("geolocation" in navigator)) {
    els.locationStatus.textContent =
      "Geolocation is not available in this browser. Use a city preset or manual coordinates.";
    return;
  }

  els.locationStatus.textContent = "Requesting your location...";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setUserPosition(
        {
          label: "Current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        `Using your location with +/- ${Math.round(position.coords.accuracy)} m accuracy.`
      );
      state.activeQuickLocation = null;
      render();
    },
    (error) => {
      els.locationStatus.textContent = `Location unavailable: ${error.message}. Try a city preset or manual coordinates.`;
    },
    {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 12_000,
    }
  );
}

async function requestHeading() {
  try {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        els.headingMode.textContent = "Compass blocked";
        return;
      }
    }

    state.hasLiveHeading = true;
    els.headingMode.textContent = "Live compass";
    els.locationStatus.textContent =
      "Live compass enabled. Rotate your device to point the arrow in real space.";
  } catch (error) {
    console.error(error);
    els.headingMode.textContent = "North-up";
    els.locationStatus.textContent =
      "Could not enable device orientation. The arrow will stay north-up.";
  }
}

function handleOrientation(event) {
  if (!state.hasLiveHeading) {
    return;
  }

  let heading = null;
  if (Number.isFinite(event.webkitCompassHeading)) {
    heading = event.webkitCompassHeading;
  } else if (Number.isFinite(event.alpha)) {
    heading = 360 - event.alpha;
  }

  if (heading === null) {
    return;
  }

  state.heading = normalizeDegrees(heading);
  els.headingMode.textContent = `${Math.round(state.heading)} deg live`;
  render();
}

function handleManualPosition(event) {
  event.preventDefault();
  const latitude = Number(els.latitude.value);
  const longitude = Number(els.longitude.value);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    els.locationStatus.textContent =
      "Enter valid coordinates: latitude -90 to 90, longitude -180 to 180.";
    return;
  }

  setUserPosition(
    {
      label: "Manual position",
      latitude,
      longitude,
    },
    `Using manual position ${latitude.toFixed(4)}, ${longitude.toFixed(4)}.`
  );
  state.activeQuickLocation = null;
  render();
}

function setUserPosition(position, message) {
  state.userPosition = position;
  syncManualFields();
  els.locationStatus.textContent = message;
}

function syncManualFields() {
  els.latitude.value = Number(state.userPosition.latitude).toFixed(5);
  els.longitude.value = Number(state.userPosition.longitude).toFixed(5);
}

function toggleMobileOptions() {
  document.body.classList.toggle("mobile-options-open");
  if (document.body.classList.contains("mobile-options-open")) {
    document.body.classList.remove("mobile-list-open");
  }
  syncMobileToggleButtons();
}

function toggleMobileList() {
  document.body.classList.toggle("mobile-list-open");
  if (document.body.classList.contains("mobile-list-open")) {
    document.body.classList.remove("mobile-options-open");
  }
  syncMobileToggleButtons();
}

function syncMobileToggleButtons() {
  els.mobileOptionsToggle.classList.toggle(
    "is-active",
    document.body.classList.contains("mobile-options-open")
  );
  els.mobileOptionsToggle.textContent = document.body.classList.contains(
    "mobile-options-open"
  )
    ? "Compass"
    : "Options";

  els.mobileListToggle.classList.toggle(
    "is-active",
    document.body.classList.contains("mobile-list-open")
  );
  els.mobileListToggle.textContent = document.body.classList.contains("mobile-list-open")
    ? "Compass"
    : "Nearby";
}

function resetFilters() {
  for (const input of els.filterInputs) {
    input.checked = true;
  }
  els.greenOnly.checked = false;
  els.preferStars.checked = false;
  render();
}

function getActiveDistinctions() {
  return new Set(
    els.filterInputs.filter((input) => input.checked).map((input) => input.value)
  );
}

function getMatches() {
  const active = getActiveDistinctions();
  const greenOnly = els.greenOnly.checked;
  const preferStars = els.preferStars.checked;

  return state.restaurants
    .filter((restaurant) => active.has(restaurant.distinction))
    .filter((restaurant) => !greenOnly || restaurant.greenStar)
    .map((restaurant) => {
      const distanceKm = haversineDistanceKm(state.userPosition, restaurant);
      const bearing = bearingDegrees(state.userPosition, restaurant);
      const rankingDistance =
        preferStars && STAR_WEIGHT[restaurant.distinction]
          ? distanceKm * STAR_WEIGHT[restaurant.distinction]
          : distanceKm;

      return {
        ...restaurant,
        distanceKm,
        rankingDistance,
        bearing,
      };
    })
    .sort((a, b) => a.rankingDistance - b.rankingDistance);
}

function render() {
  const matches = getMatches();
  const target = matches[0];

  renderDatasetSummary();
  renderQuickLocations();
  renderTarget(target, matches.length);
  renderNearby(matches.slice(0, 8));
}

function renderDatasetSummary() {
  const country = state.metadata.country ? `${state.metadata.country} - ` : "";
  const source = state.dataSource === "live" ? "live" : state.dataSource;
  els.dataCount.textContent = `${country}${state.restaurants.length.toLocaleString()} restaurants (${source})`;
}

function renderQuickLocations() {
  for (const button of els.quickLocationButtons) {
    button.classList.toggle(
      "is-active",
      button.dataset.location === state.activeQuickLocation
    );
  }
}

function renderTarget(target, count) {
  const previousTargetKey = restaurantKey(state.currentTarget);
  const nextTargetKey = restaurantKey(target);
  state.currentTarget = target ?? null;
  if (previousTargetKey !== nextTargetKey) {
    clearReviews();
  }
  els.matchCount.textContent = String(count);

  if (!target) {
    els.targetName.textContent = "No matches";
    els.targetMeta.textContent = "Try enabling more distinctions or loading a richer dataset.";
    els.targetDistance.textContent = "-";
    els.targetBearing.textContent = "-";
    els.directionsLink.href = "#";
    els.guideLink.href = "#";
    els.mapsReviewsLink.href = "#";
    els.directionsLink.setAttribute("aria-disabled", "true");
    els.guideLink.setAttribute("aria-disabled", "true");
    els.reviewsButton.setAttribute("aria-disabled", "true");
    els.mapsReviewsLink.setAttribute("aria-disabled", "true");
    rotateNeedle(0);
    return;
  }

  const relativeBearing =
    state.heading === null
      ? target.bearing
      : normalizeDegrees(target.bearing - state.heading);

  els.targetName.textContent = target.name;
  els.targetMeta.textContent = [
    DISTINCTION_LABELS[target.distinction] ?? target.distinction,
    target.city,
    target.region,
    target.cuisine,
    target.greenStar ? "sustainable tag" : null,
  ]
    .filter(Boolean)
    .join(" - ");
  els.targetDistance.textContent = formatDistance(target.distanceKm);
  els.targetBearing.textContent = `${Math.round(target.bearing)} deg`;
  els.directionsLink.href = directionsUrl(target);
  els.guideLink.href = guideUrl(target);
  els.mapsReviewsLink.href = googleMapsSearchUrl(target);
  els.directionsLink.removeAttribute("aria-disabled");
  els.guideLink.removeAttribute("aria-disabled");
  els.reviewsButton.removeAttribute("aria-disabled");
  els.mapsReviewsLink.removeAttribute("aria-disabled");
  rotateNeedle(relativeBearing);
}

function renderNearby(matches) {
  els.nearbyList.replaceChildren(
    ...matches.map((match, index) => {
      const item = document.createElement("li");
      item.className = "nearby-item";

      const top = document.createElement("div");
      top.className = "nearby-item__top";

      const name = document.createElement("strong");
      name.textContent = `${index + 1}. ${match.name}`;

      const badge = document.createElement("span");
      badge.className = "distinction";
      badge.textContent = DISTINCTION_LABELS[match.distinction] ?? match.distinction;

      top.append(name, badge);

      const meta = document.createElement("p");
      meta.textContent = `${formatDistance(match.distanceKm)} - ${Math.round(
        match.bearing
      )} deg - ${[match.city, match.region, match.cuisine]
        .filter(Boolean)
        .join(" - ")}`;

      const links = document.createElement("p");
      const directions = document.createElement("a");
      directions.href = directionsUrl(match);
      directions.target = "_blank";
      directions.rel = "noreferrer";
      directions.textContent = "Directions";

      const guide = document.createElement("a");
      guide.href = guideUrl(match);
      guide.target = "_blank";
      guide.rel = "noreferrer";
      guide.textContent = "Guide";

      const reviews = document.createElement("a");
      reviews.href = googleMapsSearchUrl(match);
      reviews.target = "_blank";
      reviews.rel = "noreferrer";
      reviews.textContent = "Google reviews";

      links.append(
        directions,
        document.createTextNode(" - "),
        guide,
        document.createTextNode(" - "),
        reviews
      );

      item.append(top, meta, links);
      return item;
    })
  );
}

function restaurantKey(restaurant) {
  return restaurant ? restaurant.id || `${restaurant.name}-${restaurant.city}` : "";
}

async function showGoogleReviews() {
  const restaurant = state.currentTarget;
  if (!restaurant) {
    return;
  }

  els.reviewsPanel.hidden = false;
  els.reviewsPanel.replaceChildren();
  renderReviewsLoading(restaurant);

  if (!CONFIG.googleMapsApiKey) {
    renderReviewsSetupNotice(restaurant);
    return;
  }

  try {
    const cacheKey = restaurant.googlePlaceId || restaurant.id || restaurant.name;
    if (!googleReviewsCache.has(cacheKey)) {
      googleReviewsCache.set(cacheKey, await fetchGoogleReviews(restaurant));
    }
    renderReviews(restaurant, googleReviewsCache.get(cacheKey));
  } catch (error) {
    console.error(error);
    renderReviewsError(restaurant, error);
  }
}

function clearReviews() {
  els.reviewsPanel.hidden = true;
  els.reviewsPanel.replaceChildren();
}

function renderReviewsLoading(restaurant) {
  const title = document.createElement("h4");
  title.textContent = `Google reviews for ${restaurant.name}`;
  const summary = document.createElement("p");
  summary.className = "reviews-panel__summary";
  summary.textContent = "Loading Google Maps place details...";
  els.reviewsPanel.append(title, summary);
}

function renderReviewsSetupNotice(restaurant) {
  els.reviewsPanel.replaceChildren();
  const title = document.createElement("h4");
  title.textContent = "Google Maps reviews are ready to enable";
  const summary = document.createElement("p");
  summary.className = "reviews-panel__summary";
  summary.textContent =
    "Add a Google Maps JavaScript API key with Places enabled to config.js. Until then, use the Google Maps reviews link.";
  const link = document.createElement("a");
  link.href = googleMapsSearchUrl(restaurant);
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "Open reviews on Google Maps";
  els.reviewsPanel.append(title, summary, link);
}

function renderReviews(restaurant, place) {
  els.reviewsPanel.replaceChildren();

  const title = document.createElement("h4");
  title.textContent = `Google reviews for ${place.name || restaurant.name}`;

  const summary = document.createElement("p");
  summary.className = "reviews-panel__summary";
  const reviewCount = place.user_ratings_total
    ? `${place.user_ratings_total.toLocaleString()} ratings`
    : "rating count unavailable";
  summary.textContent = place.rating
    ? `${place.rating.toFixed(1)} out of 5 - ${reviewCount}`
    : reviewCount;

  const list = document.createElement("ol");
  list.className = "reviews-list";

  const reviews = Array.isArray(place.reviews) ? place.reviews.slice(0, 5) : [];
  for (const review of reviews) {
    const item = document.createElement("li");
    item.className = "review";

    const author = document.createElement("strong");
    author.textContent = review.author_name || "Google Maps user";

    const rating = document.createElement("small");
    rating.textContent = `${review.rating ?? "-"} / 5${
      review.relative_time_description ? ` - ${review.relative_time_description}` : ""
    }`;

    const text = document.createElement("p");
    text.textContent = review.text || "No review text provided.";

    item.append(author, rating, text);
    list.append(item);
  }

  const notice = document.createElement("p");
  notice.className = "reviews-panel__notice";
  notice.textContent =
    "Reviews and ratings are provided by Google Maps and may be incomplete in the API response.";

  const mapsLink = document.createElement("a");
  mapsLink.href = place.url || googleMapsSearchUrl(restaurant);
  mapsLink.target = "_blank";
  mapsLink.rel = "noreferrer";
  mapsLink.textContent = reviews.length
    ? "Open full listing on Google Maps"
    : "Open reviews on Google Maps";

  els.reviewsPanel.append(title, summary);
  if (reviews.length) {
    els.reviewsPanel.append(list);
  }
  els.reviewsPanel.append(mapsLink, notice);
}

function renderReviewsError(restaurant, error) {
  els.reviewsPanel.replaceChildren();
  const title = document.createElement("h4");
  title.textContent = "Could not load Google reviews";
  const summary = document.createElement("p");
  summary.className = "reviews-panel__summary";
  summary.textContent =
    error?.message === "ZERO_RESULTS"
      ? "Google Maps could not confidently match this restaurant. Use the Google Maps link instead."
      : "Check that the API key allows Maps JavaScript API and Places, and is restricted to this site.";
  const link = document.createElement("a");
  link.href = googleMapsSearchUrl(restaurant);
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "Open reviews on Google Maps";
  els.reviewsPanel.append(title, summary, link);
}

async function fetchGoogleReviews(restaurant) {
  await ensureGoogleMaps();
  const service = getPlacesService();
  const placeId = restaurant.googlePlaceId || (await findPlaceId(service, restaurant));

  return new Promise((resolve, reject) => {
    service.getDetails(
      {
        placeId,
        fields: ["name", "rating", "user_ratings_total", "reviews", "url"],
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          reject(new Error(status || "PLACE_DETAILS_FAILED"));
          return;
        }
        resolve(place);
      }
    );
  });
}

async function findPlaceId(service, restaurant) {
  return new Promise((resolve, reject) => {
    service.findPlaceFromQuery(
      {
        query: googleMapsQuery(restaurant),
        fields: ["place_id", "name", "formatted_address"],
      },
      (results, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !Array.isArray(results) ||
          !results.length ||
          !results[0].place_id
        ) {
          reject(new Error(status || "ZERO_RESULTS"));
          return;
        }
        resolve(results[0].place_id);
      }
    );
  });
}

async function ensureGoogleMaps() {
  if (window.google?.maps?.places) {
    return;
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const key = CONFIG.googleMapsApiKey?.trim();
  if (!key) {
    throw new Error("NO_GOOGLE_MAPS_KEY");
  }

  const language = CONFIG.googleMapsLanguage || "en";
  const region = CONFIG.googleMapsRegion || "FR";

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      libraries: "places",
      language,
      region,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("GOOGLE_MAPS_LOAD_FAILED")), {
      once: true,
    });
    document.head.append(script);
  });

  return googleMapsPromise;
}

function getPlacesService() {
  if (placesService) {
    return placesService;
  }

  const host = document.createElement("div");
  host.hidden = true;
  document.body.append(host);
  placesService = new google.maps.places.PlacesService(host);
  return placesService;
}

function rotateNeedle(degrees) {
  els.needle.style.transform = `rotate(${degrees}deg)`;
}

function haversineDistanceKm(from, to) {
  const earthRadiusKm = 6371.0088;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function bearingDegrees(from, to) {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

function directionsUrl(restaurant) {
  const origin = `${state.userPosition.latitude},${state.userPosition.longitude}`;
  const destination = `${restaurant.latitude},${restaurant.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    origin
  )}&destination=${encodeURIComponent(destination)}&travelmode=walking`;
}

function googleMapsQuery(restaurant) {
  return [restaurant.name, restaurant.address, restaurant.city, "France"]
    .filter(Boolean)
    .join(" ");
}

function googleMapsSearchUrl(restaurant) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    googleMapsQuery(restaurant)
  )}`;
}

function guideSearchUrl(restaurant) {
  const query = `${restaurant.name} ${restaurant.city} Michelin Guide`;
  return `https://guide.michelin.com/en/search?q=${encodeURIComponent(query)}`;
}

function guideUrl(restaurant) {
  return safeExternalUrl(restaurant.michelinUrl) || guideSearchUrl(restaurant);
}

function safeExternalUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

init();
