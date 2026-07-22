import { mkdir, writeFile } from "node:fs/promises";

const GENERATION_URL = "https://www.kpx.or.kr/powerSource.es?device=chart&mid=a10404030000";
const SYSTEM_URL = "https://www.kpx.or.kr/powerinfoSubmain.es?mid=a10404030000";
const SYSTEM_URLS = [
  SYSTEM_URL,
  "https://www.kpx.or.kr/powerinfoGraph.es?device=mbl&mid=a30102000000",
];
const headers = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
  "User-Agent": "Mozilla/5.0 (compatible; gyubeanie-kpx-snapshot/1.0; +https://gyubeanie.github.io/)",
};

async function get(url) {
  const response = await fetch(url, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.text();
}

function arraySource(text, name) {
  const marker = text.match(new RegExp(`\\bvar\\s+${name}\\s*=\\s*`));
  if (marker?.index === undefined) throw new Error(`Missing ${name}`);

  const start = marker.index + marker[0].length;
  if (text[start] !== "[") throw new Error(`${name} was not an array`);

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "[") depth += 1;
    else if (character === "]" && --depth === 0) return text.slice(start, index + 1);
  }
  throw new Error(`Incomplete ${name}`);
}

const numeric = (value) => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};
const positive = (value) => Math.max(0, numeric(value));

const factors = {
  nuclear: 12,
  coal: 820,
  gas: 490,
  solar: 48,
  wind: 11,
  hydro: 24,
  otherRenewables: 230,
  oil: 650,
  pumpedStorage: null,
};
const meta = {
  nuclear: ["Nuclear", "원자력", "#ccff3e"],
  coal: ["Coal", "석탄", "#8a6d5e"],
  gas: ["Gas", "가스", "#ff8552"],
  solar: ["Solar", "태양광", "#ffd75a"],
  wind: ["Wind", "풍력", "#58c8ff"],
  hydro: ["Hydro", "수력", "#4f7dff"],
  otherRenewables: ["Other renewables", "기타 신재생", "#58d2a0"],
  oil: ["Oil", "유류", "#b596ff"],
  pumpedStorage: ["Pumped storage", "양수", "#5c7b82"],
};

function normalizeGenerationRecord(record) {
  const ppaSolarMw = positive(record.ppa);
  const btmSolarMw = positive(record.btm);
  const rawPumpedStorageMw = numeric(record.raisingWater);
  const values = {
    hydro: positive(record.waterPower),
    oil: positive(record.oil),
    coal: positive(record.totCoal),
    nuclear: positive(record.nuclearPower),
    pumpedStorage: Math.max(0, rawPumpedStorageMw),
    gas: positive(record.gas),
    solar: positive(record.sunlight) + ppaSolarMw + btmSolarMw,
    wind: positive(record.windPower),
    otherRenewables: positive(record.newRenewable),
  };
  const generationMwExact = Object.values(values).reduce((sum, value) => sum + value, 0);
  const attributedGenerationMwExact = generationMwExact - values.pumpedStorage;
  const weightedLifecycleEmissions = Object.keys(values).reduce((sum, key) => {
    const factor = factors[key];
    return factor === null ? sum : sum + values[key] * factor;
  }, 0);
  const renewableMw = values.hydro + values.solar + values.wind + values.otherRenewables;
  const knownLowCarbonMw = values.nuclear + values.hydro + values.solar + values.wind;

  const point = {
    asOf: record.regDate,
    generationMw: Math.round(generationMwExact),
    attributedGenerationMw: Math.round(attributedGenerationMwExact),
    carbonIntensity: Math.round(
      weightedLifecycleEmissions / Math.max(1, attributedGenerationMwExact),
    ),
    emissionsTonnesPerHour: Math.round(weightedLifecycleEmissions / 1_000),
  };
  const sources = Object.keys(values)
    .map((key) => ({
      key,
      label: meta[key][0],
      labelKo: meta[key][1],
      color: meta[key][2],
      mw: Math.round(values[key]),
      share: generationMwExact ? values[key] / generationMwExact * 100 : 0,
      factor: factors[key],
    }))
    .filter((source) => source.mw > 0)
    .sort((left, right) => right.mw - left.mw);

  return {
    point,
    generationMwExact,
    pumpedStorageLoadMw: Math.round(Math.max(0, -rawPumpedStorageMw)),
    renewableShare: generationMwExact ? renewableMw / generationMwExact * 100 : 0,
    knownLowCarbonShare: generationMwExact ? knownLowCarbonMw / generationMwExact * 100 : 0,
    sources,
  };
}

function generation(html) {
  const rows = JSON.parse(arraySource(html, "ictArr"));
  const recordsByTimestamp = new Map();
  for (const row of rows) {
    const asOf = String(row?.regDate ?? "");
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(asOf)) continue;

    const normalized = normalizeGenerationRecord(row);
    if (normalized.generationMwExact > 0) recordsByTimestamp.set(asOf, normalized);
  }

  const history = [...recordsByTimestamp.values()]
    .sort((left, right) => left.point.asOf.localeCompare(right.point.asOf));
  const latest = history.at(-1);
  if (!latest) throw new Error("No current generation record");

  return {
    asOf: latest.point.asOf,
    generationMw: latest.point.generationMw,
    reportedMarketDemandMw: null,
    estimatedTotalDemandMw: null,
    pumpedStorageLoadMw: latest.pumpedStorageLoadMw,
    carbonIntensity: latest.point.carbonIntensity,
    emissionsTonnesPerHour: latest.point.emissionsTonnesPerHour,
    renewableShare: latest.renewableShare,
    knownLowCarbonShare: latest.knownLowCarbonShare,
    sources: latest.sources,
    emissionsHistory: history.map(({ point }) => point),
  };
}

function textNumber(value) {
  if (value === undefined) return null;
  const sanitized = value.replace(/[^0-9.-]/g, "");
  const result = Number(sanitized);
  return sanitized && Number.isFinite(result) ? result : null;
}

function byId(html, id) {
  const match = html.match(
    new RegExp(`<([a-z][\\w:-]*)\\b[^>]*\\bid\\s*=\\s*["']${id}["'][^>]*>([\\s\\S]*?)<\\/\\1\\s*>`, "i"),
  );
  return textNumber(match?.[2].replace(/<[^>]+>/g, " "));
}

function numbers(html, name) {
  const match = html.match(
    new RegExp(`(?:var|let|const)\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;?`, "i"),
  );
  if (!match) return [];
  return match[1].split(",").map((value) => {
    const sanitized = value.trim().replace(/^(["'])(.*)\\1$/, "$2");
    if (!sanitized || sanitized === "null" || sanitized === "undefined") return null;
    const result = Number(sanitized);
    return Number.isFinite(result) ? result : null;
  });
}

function system(html) {
  const capacityFromPage = byId(html, "avil");
  const marketFromPage = byId(html, "load");
  const reserveFromPage = byId(html, "supPow");
  const rateFromPage = byId(html, "supPer");
  const timestamps = numbers(html, "t_time");
  const marketDemand = numbers(html, "x");
  const totalDemand = numbers(html, "v");
  const demandHistory = Array.from(
    { length: Math.min(timestamps.length, marketDemand.length, totalDemand.length) },
    (_, index) => {
      const asOf = String(Math.trunc(timestamps[index]));
      return timestamps[index] !== null
        && marketDemand[index] > 0
        && totalDemand[index] > 0
        && /^\d{12,14}$/.test(asOf)
        ? { asOf, totalDemandMw: totalDemand[index], marketDemandMw: marketDemand[index] }
        : null;
    },
  ).filter(Boolean);
  const latest = demandHistory.at(-1);
  const currentMarketDemandMw = marketFromPage ?? latest?.marketDemandMw ?? null;
  const supplyCapacityMw = capacityFromPage ?? (
    currentMarketDemandMw !== null && reserveFromPage !== null
      ? currentMarketDemandMw + reserveFromPage
      : null
  );
  const supplyReserveMw = reserveFromPage ?? (
    supplyCapacityMw !== null && currentMarketDemandMw !== null
      ? supplyCapacityMw - currentMarketDemandMw
      : null
  );
  const supplyReserveRate = rateFromPage ?? (
    supplyReserveMw !== null && currentMarketDemandMw > 0
      ? supplyReserveMw / currentMarketDemandMw * 100
      : null
  );
  if (
    !latest
    || supplyCapacityMw <= 0
    || currentMarketDemandMw <= 0
    || supplyReserveMw < 0
    || supplyReserveRate < 0
  ) {
    throw new Error("Incomplete system snapshot");
  }
  return {
    asOf: latest.asOf,
    supplyCapacityMw: Math.round(supplyCapacityMw),
    currentMarketDemandMw: Math.round(currentMarketDemandMw),
    currentTotalDemandMw: Math.round(latest.totalDemandMw),
    supplyReserveMw: Math.round(supplyReserveMw),
    supplyReserveRate,
    demandHistory,
  };
}

async function loadSystem() {
  let lastError;
  for (const url of SYSTEM_URLS) {
    try {
      return system(await get(url));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("System pages unavailable");
}

const [generationSnapshot, systemSnapshot] = await Promise.all([
  get(GENERATION_URL).then(generation),
  loadSystem(),
]);
const fetchedAt = new Date().toISOString();
const output = {
  "data/kpx-live.json": {
    schemaVersion: 1,
    kind: "kpx-generation",
    fetchedAt,
    sourceUrl: GENERATION_URL,
    payload: generationSnapshot,
  },
  "data/kpx-system.json": {
    schemaVersion: 1,
    kind: "kpx-system",
    fetchedAt,
    sourceUrl: SYSTEM_URL,
    payload: systemSnapshot,
  },
};

await mkdir("data", { recursive: true });
await Promise.all(
  Object.entries(output).map(([path, snapshot]) => (
    writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`)
  )),
);
console.log(`Updated KPX snapshots at ${fetchedAt}`);
