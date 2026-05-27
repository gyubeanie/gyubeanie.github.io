const fs = require("node:fs");
const path = require("node:path");

const dataPath = path.join(__dirname, "..", "data", "restaurants.france.sample.json");
const payload = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const restaurants = payload.restaurants;

const validDistinctions = new Set([
  "3-stars",
  "2-stars",
  "1-star",
  "bib-gourmand",
  "selected",
]);

assert(Array.isArray(restaurants), "restaurants must be an array");
assert(restaurants.length >= 5, "sample dataset should include several restaurants");

const ids = new Set();
const distinctions = new Set();

for (const restaurant of restaurants) {
  assert(restaurant.id, "restaurant.id is required");
  assert(!ids.has(restaurant.id), `duplicate id: ${restaurant.id}`);
  ids.add(restaurant.id);

  assert(restaurant.name, `${restaurant.id}: name is required`);
  assert(validDistinctions.has(restaurant.distinction), `${restaurant.id}: bad distinction`);
  distinctions.add(restaurant.distinction);

  assert(Number.isFinite(restaurant.latitude), `${restaurant.id}: latitude must be numeric`);
  assert(Number.isFinite(restaurant.longitude), `${restaurant.id}: longitude must be numeric`);
  assert(Math.abs(restaurant.latitude) <= 90, `${restaurant.id}: latitude out of range`);
  assert(Math.abs(restaurant.longitude) <= 180, `${restaurant.id}: longitude out of range`);
}

for (const distinction of validDistinctions) {
  assert(distinctions.has(distinction), `missing sample for ${distinction}`);
}

const paris = { latitude: 48.8566, longitude: 2.3522 };
const nearest = restaurants
  .map((restaurant) => ({
    name: restaurant.name,
    distanceKm: haversineDistanceKm(paris, restaurant),
  }))
  .sort((a, b) => a.distanceKm - b.distanceKm)[0];

assert(nearest.distanceKm < 5, "nearest sample restaurant should be close to central Paris");

console.log(`OK: ${restaurants.length} sample restaurants validated.`);
console.log(`Nearest to Paris preset: ${nearest.name} (${nearest.distanceKm.toFixed(2)} km).`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}
