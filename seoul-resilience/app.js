const DOMAIN_ORDER = ["food", "power", "water", "mobility", "civil"];

const DOMAINS = {
    food: {
        label: "식량·생활물류",
        title: "식량·생활물류 대비상태",
        short: "식",
        description: "식품·생활필수품 보급 접근성과 물류 차질 민감도",
        actions: [
            "임시 보급거점 사전지정 및 권역별 재고 분산 검토",
            "주요 보급축 차단 시 우회수송 계획과 임시 하역지점 검토",
            "취약 행정동 대상 생활필수품 긴급배분 기준 정교화"
        ]
    },
    power: {
        label: "전력수요 압박",
        title: "전력수요 압박 대비상태",
        short: "전",
        description: "폭염·핵심시설 가동 조건에서 전력수요 압박에 대한 완충 여력",
        actions: [
            "대피·급수·응급시설의 비상전원 지속시간 확인",
            "폭염 시 냉방 피크 대응을 위한 수요관리 우선순위 검토",
            "공공시설 중심의 임시 냉방·충전 거점 운영계획 검토"
        ]
    },
    water: {
        label: "급수·비상급수",
        title: "급수·비상급수 대비상태",
        short: "수",
        description: "상시 급수수요 증가와 비상급수 접근성에 대한 방호 여력",
        actions: [
            "비상급수 거점 접근권역과 실제 수용수요 재검토",
            "폭염·정전 동시 상황에서 급수시설 가동 우선순위 확인",
            "저지대·침수 시 비상급수 수송 동선 대체안 검토"
        ]
    },
    mobility: {
        label: "이동·보급 접근성",
        title: "이동·보급 접근성 대비상태",
        short: "이",
        description: "핵심 생활유지기능을 연결하는 이동·수송 네트워크의 지속성",
        actions: [
            "보급·응급 이동축의 우회경로 및 교량 의존도 점검",
            "호우 시 도로속도 저하를 반영한 권역별 도착시간 재산정",
            "지하철·간선도로·하천횡단축의 대체 조합 검토"
        ]
    },
    civil: {
        label: "민방위·응급기반",
        title: "민방위·응급기반 대비상태",
        short: "민",
        description: "대피·응급·공공시설 기반의 인구 수요 대비 수용 여력",
        actions: [
            "대피시설·응급시설 밀도와 취약 인구 수요의 불일치 확인",
            "공공시설의 임시 대피·급수·냉방 전환계획 검토",
            "권역별 주민 안내·동원·수송 프로토콜 정비"
        ]
    }
};

const DISTRICT_NAMES = {
    "11110": "종로구",
    "11140": "중구",
    "11170": "용산구",
    "11200": "성동구",
    "11215": "광진구",
    "11230": "동대문구",
    "11260": "중랑구",
    "11290": "성북구",
    "11305": "강북구",
    "11320": "도봉구",
    "11350": "노원구",
    "11380": "은평구",
    "11410": "서대문구",
    "11440": "마포구",
    "11470": "양천구",
    "11500": "강서구",
    "11530": "구로구",
    "11545": "금천구",
    "11560": "영등포구",
    "11590": "동작구",
    "11620": "관악구",
    "11650": "서초구",
    "11680": "강남구",
    "11710": "송파구",
    "11740": "강동구"
};

const VALUE_LABELS = {
    heat: ["낮음", "중간", "높음"],
    rain: ["낮음", "중간", "높음"],
    road: ["없음", "중간", "심각"],
    powerDemand: ["기준", "증가", "급증"],
    waterDemand: ["기준", "증가", "급증"],
    logistics: ["없음", "중간", "심각"]
};

const PRESETS = {
    baseline: { heat: 0, rain: 0, road: 0, powerDemand: 0, waterDemand: 0, logistics: 0 },
    heat: { heat: 2, rain: 0, road: 1, powerDemand: 2, waterDemand: 1, logistics: 0 },
    rain: { heat: 0, rain: 2, road: 2, powerDemand: 1, waterDemand: 1, logistics: 2 },
    compound: { heat: 2, rain: 2, road: 2, powerDemand: 2, waterDemand: 2, logistics: 2 }
};

const ASSETS = [
    { type: "food", name: "동남권 식량 보급거점", code: "F-SE", lat: 37.494, lng: 127.111 },
    { type: "food", name: "서남권 생활물류 거점", code: "F-SW", lat: 37.551, lng: 126.835 },
    { type: "food", name: "도심 임시 보급거점", code: "F-C", lat: 37.566, lng: 126.978 },
    { type: "water", name: "동북권 비상급수 권역", code: "W-NE", lat: 37.646, lng: 127.073 },
    { type: "water", name: "서북권 비상급수 권역", code: "W-NW", lat: 37.613, lng: 126.927 },
    { type: "water", name: "한강남부 급수 지원권역", code: "W-S", lat: 37.495, lng: 126.988 },
    { type: "civil", name: "북부 민방위 지원권역", code: "C-N", lat: 37.638, lng: 127.025 },
    { type: "civil", name: "서남부 민방위 지원권역", code: "C-SW", lat: 37.485, lng: 126.901 },
    { type: "medical", name: "동부 응급지원 권역", code: "M-E", lat: 37.532, lng: 127.123 },
    { type: "medical", name: "서부 응급지원 권역", code: "M-W", lat: 37.556, lng: 126.883 }
];

const CORRIDORS = [
    {
        name: "한강 남북 연계축",
        coords: [[37.556, 126.82], [37.544, 126.92], [37.522, 127.02], [37.518, 127.13]],
        color: "#8eb680"
    },
    {
        name: "서남-동북 보급축",
        coords: [[37.468, 126.88], [37.514, 126.96], [37.566, 127.02], [37.64, 127.07]],
        color: "#d6a348"
    },
    {
        name: "도심-동남 응급축",
        coords: [[37.57, 126.98], [37.54, 127.04], [37.505, 127.11], [37.49, 127.16]],
        color: "#6ea5c8"
    }
];

const state = {
    domain: "food",
    scale: "dong",
    base: "none",
    scenario: { ...PRESETS.compound },
    overlays: { assets: true, corridors: true },
    selected: null
};

let map;
let dongData;
let guData;
let gridCells = [];
let activeBaseLayer = null;
let activeLayer = null;
let highlightedLayer = null;
let selectedLayer = null;
let layers = {};
let liveData = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", init);

async function init() {
    $("#timestamp").textContent = new Intl.DateTimeFormat("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date());

    bindControls();
    initMap();

    const [neighborhoods, municipalities, liveSnapshot] = await Promise.all([
        fetch("./data/seoul_neighborhoods_geo_simple.json").then((r) => r.json()),
        fetch("./data/seoul_municipalities_geo_simple.json").then((r) => r.json()),
        fetchOptionalJSON("./data/seoul-live.json")
    ]);

    liveData = liveSnapshot;
    dongData = prepareGeoJSON(neighborhoods, "dong");
    guData = prepareGeoJSON(municipalities, "gu");
    gridCells = buildGridCells(guData);

    buildMapLayers();
    setScale("dong");
    applyPreset("compound", { silent: true });
    renderLiveFeed();
    updateDashboard();
    selectFirstPriority();
    document.querySelector(".map-loading")?.remove();
}

async function fetchOptionalJSON(url) {
    try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return null;
        return response.json();
    } catch {
        return null;
    }
}

function bindControls() {
    $("#domainTabs").addEventListener("click", (event) => {
        const button = event.target.closest("[data-domain]");
        if (!button) return;
        state.domain = button.dataset.domain;
        $$(".domain-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
        updateDashboard();
    });

    $$(".stress-control input").forEach((input) => {
        input.addEventListener("input", () => {
            state.scenario[input.dataset.scenario] = Number(input.value);
            setPresetActive(null);
            updateScenarioLabels();
            updateDashboard();
        });
    });

    $$(".preset-btn").forEach((button) => {
        button.addEventListener("click", () => applyPreset(button.dataset.preset));
    });

    $("#scaleControls").addEventListener("click", (event) => {
        const button = event.target.closest("[data-scale]");
        if (!button) return;
        setScale(button.dataset.scale);
        $$("#scaleControls button").forEach((btn) => btn.classList.toggle("active", btn === button));
        updateDashboard();
        selectFirstPriority();
    });

    $("#baseControls").addEventListener("click", (event) => {
        const button = event.target.closest("[data-base]");
        if (!button) return;
        setBase(button.dataset.base);
        $$("#baseControls button").forEach((btn) => btn.classList.toggle("active", btn === button));
    });

    $$(".layer-toggles input[type='checkbox']").forEach((input) => {
        input.addEventListener("change", () => {
            state.overlays[input.dataset.overlay] = input.checked;
            updateOverlayVisibility();
        });
    });
}

function initMap() {
    map = L.map("map", {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true
    }).setView([37.5665, 126.9780], 11);

    map.zoomControl.setPosition("bottomright");

    layers = {
        bases: {
            none: null,
            vector: L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap &copy; CARTO"
            }),
            satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
                maxZoom: 19,
                attribution: "Tiles &copy; Esri"
            })
        },
        dong: null,
        gu: null,
        grid: L.layerGroup(),
        assets: L.layerGroup(),
        corridors: L.layerGroup()
    };
}

function prepareGeoJSON(data, type) {
    data.features.forEach((feature) => {
        feature.properties.__type = type;
        feature.properties.__code = type === "dong" ? feature.properties.EMD_CD : feature.properties.SIG_CD;
        feature.properties.__districtCode = type === "dong" ? feature.properties.EMD_CD.slice(0, 5) : feature.properties.SIG_CD;
        feature.properties.__name = getFeatureName(feature, type);
        feature.properties.__districtName = DISTRICT_NAMES[feature.properties.__districtCode] || feature.properties.SIG_ENG_NM || "서울";
        feature.properties.__center = geometryCenter(feature.geometry);
    });
    return data;
}

function getFeatureName(feature, type) {
    const props = feature.properties;
    if (type === "gu") {
        return DISTRICT_NAMES[props.SIG_CD] || props.SIG_ENG_NM || props.SIG_CD;
    }
    const english = props.EMD_ENG_NM || props.EMD_CD;
    return `${english}`;
}

function buildMapLayers() {
    layers.dong = L.geoJSON(dongData, {
        style: (feature) => featureStyle(feature),
        onEachFeature: onEachFeature
    });

    layers.gu = L.geoJSON(guData, {
        style: (feature) => featureStyle(feature, { weight: 1.2, opacity: 0.78 }),
        onEachFeature: onEachFeature
    });

    buildGridLayer();
    buildAssetLayer();
    buildCorridorLayer();

    setBase("none");
    updateOverlayVisibility();
    map.fitBounds(layers.gu.getBounds(), { padding: [18, 18] });
}

function buildGridLayer() {
    layers.grid.clearLayers();
    gridCells.forEach((cell) => {
        const rectangle = L.rectangle(cell.bounds, {
            ...shapeStyleForMetrics(calculateMetrics(cell))
        });
        rectangle.__cell = cell;
        rectangle.bindTooltip(() => tooltipHTML(cell), {
            className: "resilience-tooltip",
            direction: "top",
            sticky: true
        });
        rectangle.on({
            mouseover: () => highlightShape(rectangle),
            mouseout: () => resetHighlight(rectangle),
            click: () => selectArea({ type: "grid", data: cell, layer: rectangle })
        });
        layers.grid.addLayer(rectangle);
    });
}

function buildAssetLayer() {
    ASSETS.forEach((asset) => {
        const marker = L.marker([asset.lat, asset.lng], {
            icon: L.divIcon({
                className: "",
                html: `<div class="asset-marker asset-${asset.type}">${asset.code.split("-")[0]}</div>`,
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            })
        }).bindTooltip(`<strong>${asset.name}</strong><br>${asset.code} · 권역집계/모의`, {
            className: "resilience-tooltip",
            direction: "top"
        });
        layers.assets.addLayer(marker);
    });
}

function buildCorridorLayer() {
    CORRIDORS.forEach((corridor) => {
        const line = L.polyline(corridor.coords, {
            color: corridor.color,
            weight: 2.2,
            opacity: 0.82,
            dashArray: "7 7"
        }).bindTooltip(`<strong>${corridor.name}</strong><br>이동·보급축 모의`, {
            className: "resilience-tooltip",
            direction: "top"
        });
        layers.corridors.addLayer(line);
    });
}

function setScale(scale) {
    state.scale = scale;
    $("#activeScaleLabel").textContent = scale === "dong" ? "행정동" : scale === "gu" ? "자치구" : "작전격자";

    if (activeLayer) map.removeLayer(activeLayer);
    selectedLayer = null;
    highlightedLayer = null;

    if (scale === "dong") activeLayer = layers.dong;
    if (scale === "gu") activeLayer = layers.gu;
    if (scale === "grid") activeLayer = layers.grid;

    activeLayer.addTo(map);
    restyleActiveLayer();
}

function setBase(base) {
    state.base = base;
    if (activeBaseLayer) {
        map.removeLayer(activeBaseLayer);
        activeBaseLayer = null;
    }
    const next = layers.bases[base];
    if (next) {
        next.addTo(map);
        activeBaseLayer = next;
        if (activeLayer) activeLayer.bringToFront();
        layers.corridors.bringToFront();
        layers.assets.bringToFront();
    }
}

function updateOverlayVisibility() {
    if (state.overlays.assets) {
        if (!map.hasLayer(layers.assets)) layers.assets.addTo(map);
    } else if (map.hasLayer(layers.assets)) {
        map.removeLayer(layers.assets);
    }

    if (state.overlays.corridors) {
        if (!map.hasLayer(layers.corridors)) layers.corridors.addTo(map);
    } else if (map.hasLayer(layers.corridors)) {
        map.removeLayer(layers.corridors);
    }

    if (activeLayer) activeLayer.bringToFront();
    if (map.hasLayer(layers.corridors)) layers.corridors.bringToFront();
    if (map.hasLayer(layers.assets)) layers.assets.bringToFront();
}

function onEachFeature(feature, layer) {
    layer.bindTooltip(() => tooltipHTML(feature), {
        className: "resilience-tooltip",
        direction: "top",
        sticky: true
    });

    layer.on({
        mouseover: () => highlightShape(layer),
        mouseout: () => resetHighlight(layer),
        click: () => selectArea({ type: feature.properties.__type, data: feature, layer })
    });
}

function highlightShape(layer) {
    highlightedLayer = layer;
    layer.setStyle({
        weight: 2.1,
        color: "#f4f1c9",
        fillOpacity: 0.76
    });
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
}

function resetHighlight(layer) {
    if (layer === selectedLayer) return;
    if (state.scale === "grid") {
        const metrics = calculateMetrics(layer.__cell);
        layer.setStyle(shapeStyleForMetrics(metrics));
    } else if (activeLayer) {
        activeLayer.resetStyle(layer);
    }
}

function restyleActiveLayer() {
    if (!activeLayer) return;
    if (state.scale === "grid") {
        layers.grid.eachLayer((layer) => {
            layer.setStyle(shapeStyleForMetrics(calculateMetrics(layer.__cell)));
        });
    } else {
        activeLayer.setStyle((feature) => featureStyle(feature));
    }
    if (selectedLayer) {
        selectedLayer.setStyle(selectedStyle());
        selectedLayer.bringToFront();
    }
}

function featureStyle(feature, overrides = {}) {
    return {
        ...shapeStyleForMetrics(calculateMetrics(feature)),
        weight: overrides.weight ?? 0.72,
        opacity: overrides.opacity ?? 0.62
    };
}

function shapeStyleForMetrics(metrics) {
    const status = classify(metrics[state.domain].score);
    return {
        color: "rgba(208, 226, 199, 0.46)",
        weight: 0.72,
        opacity: 0.62,
        fillColor: status.color,
        fillOpacity: 0.58
    };
}

function selectedStyle() {
    return {
        color: "#f4f1c9",
        weight: 2.4,
        opacity: 0.95,
        fillOpacity: 0.78
    };
}

function updateDashboard() {
    if (!dongData || !guData) return;
    updateScenarioLabels();
    $("#mapTitle").textContent = DOMAINS[state.domain].title;
    restyleActiveLayer();
    updateCounts();
    updatePriorityTable();
    if (state.selected) renderInspector(state.selected);
}

function updateScenarioLabels() {
    Object.entries(state.scenario).forEach(([key, value]) => {
        const label = document.querySelector(`[data-value-for="${key}"]`);
        if (label) label.textContent = VALUE_LABELS[key][value];
        const input = document.querySelector(`[data-scenario="${key}"]`);
        if (input && Number(input.value) !== value) input.value = String(value);
    });
}

function renderLiveFeed() {
    if (!liveData) {
        $("#liveFeedStatus").textContent = "미수신";
        $("#rainFeedValue").textContent = "--";
        $("#riverFeedValue").textContent = "--";
        $("#liveFeedTime").textContent = "seoul-live.json 파일을 찾을 수 없습니다.";
        return;
    }

    const rainfall = liveData.services?.rainfall || {};
    const river = liveData.services?.river_stage || {};
    const rainSummary = rainfall.summary || {};
    const riverSummary = river.summary || {};
    const okCount = [rainfall.ok, river.ok].filter(Boolean).length;

    $("#liveFeedStatus").textContent = liveData.is_live ? `수신 ${okCount}/2` : "대기";
    $("#rainFeedValue").textContent = rainfall.ok
        ? `${rainSummary.station_count ?? 0}개소 · 최대 ${formatValue(rainSummary.max_mm, "mm")}`
        : "자료대기";
    $("#riverFeedValue").textContent = river.ok
        ? `${riverSummary.station_count ?? 0}개소 · 최고 ${formatValue(riverSummary.max_level_m, "m")}`
        : "자료대기";
    $("#liveFeedTime").textContent = liveData.generated_at
        ? `최근 스냅샷: ${formatTimestamp(liveData.generated_at)} · 키 비공개`
        : "GitHub Actions 자료 갱신 대기 중";

    if (liveData.generated_at) {
        $("#timestamp").textContent = formatTimestamp(liveData.generated_at, { compact: true });
    }
}

function formatValue(value, suffix) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return `--${suffix}`;
    return `${Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}${suffix}`;
}

function formatTimestamp(value, options = {}) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        ...(options.compact ? {} : { timeZoneName: "short" })
    }).format(date);
}

function applyPreset(name, options = {}) {
    state.scenario = { ...PRESETS[name] };
    if (!options.silent) setPresetActive(name);
    updateScenarioLabels();
    updateDashboard();
}

function setPresetActive(name) {
    $$(".preset-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.preset === name);
    });
}

function selectArea(selection) {
    if (selectedLayer && selectedLayer !== selection.layer) {
        resetHighlight(selectedLayer);
    }
    selectedLayer = selection.layer;
    selectedLayer.setStyle(selectedStyle());
    selectedLayer.bringToFront();
    state.selected = selection;
    renderInspector(selection);
}

function renderInspector(selection) {
    const data = selection.data;
    const metrics = calculateMetrics(data);
    const name = displayName(data);
    const districtName = displayDistrict(data);
    const typeLabel = selection.type === "dong" ? "행정동/법정동" : selection.type === "gu" ? "자치구" : "작전격자";
    const code = data.properties?.__code || data.id;

    $("#selectedName").textContent = name;
    $("#selectedMeta").textContent = `${typeLabel} · ${districtName}${code ? ` · ${code}` : ""}`;

    $("#domainReadiness").innerHTML = DOMAIN_ORDER.map((key) => {
        const item = metrics[key];
        const status = classify(item.score);
        return `
            <div class="readiness-card">
                <div class="readiness-row">
                    <span class="readiness-name">${DOMAINS[key].label}</span>
                    <span class="status-pill ${status.className}">${status.label}</span>
                </div>
                <div class="bar-track" aria-label="${DOMAINS[key].label} 모형값">
                    <div class="bar-fill ${status.className}" style="width:${item.score}%"></div>
                </div>
            </div>
        `;
    }).join("");

    const active = metrics[state.domain];
    $("#driversList").innerHTML = active.drivers.map((driver) => `<li>${driver}</li>`).join("");

    const vulnerableDomains = DOMAIN_ORDER
        .filter((key) => classify(metrics[key].score).key === "vulnerable")
        .slice(0, 2);
    const activeActions = vulnerableDomains.length
        ? vulnerableDomains.flatMap((key) => DOMAINS[key].actions.slice(0, 2))
        : DOMAINS[state.domain].actions;
    $("#actionsList").innerHTML = activeActions.slice(0, 4).map((action) => `<li>${action}</li>`).join("");
}

function updateCounts() {
    const items = currentItems();
    const counts = { good: 0, watch: 0, vulnerable: 0 };
    items.forEach((item) => {
        const status = classify(calculateMetrics(item)[state.domain].score).key;
        counts[status] += 1;
    });
    $("#goodCount").textContent = counts.good;
    $("#watchCount").textContent = counts.watch;
    $("#vulnerableCount").textContent = counts.vulnerable;
}

function updatePriorityTable() {
    const rows = currentItems()
        .map((item) => {
            const metrics = calculateMetrics(item);
            return {
                item,
                metrics,
                activeScore: metrics[state.domain].score,
                vulnerableCount: DOMAIN_ORDER.filter((key) => classify(metrics[key].score).key === "vulnerable").length
            };
        })
        .sort((a, b) => (a.activeScore - b.activeScore) || (b.vulnerableCount - a.vulnerableCount))
        .slice(0, 12);

    $("#priorityRows").innerHTML = rows.map((row, index) => {
        const status = classify(row.activeScore);
        return `
            <tr data-priority-index="${index}">
                <td>${displayName(row.item)}</td>
                <td>${displayDistrict(row.item)}</td>
                <td><span class="status-pill ${status.className}">${status.label}</span></td>
                <td>
                    <div class="mini-statuses">
                        ${DOMAIN_ORDER.map((key) => {
                            const st = classify(row.metrics[key].score);
                            return `<span class="${st.className}" title="${DOMAINS[key].label}: ${st.label}">${DOMAINS[key].short}</span>`;
                        }).join("")}
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    $$("#priorityRows tr").forEach((tr, index) => {
        tr.addEventListener("click", () => selectItem(rows[index].item));
    });
}

function selectFirstPriority() {
    const first = currentItems()
        .map((item) => ({ item, score: calculateMetrics(item)[state.domain].score }))
        .sort((a, b) => a.score - b.score)[0];
    if (first) selectItem(first.item, { fit: false });
}

function selectItem(item, options = {}) {
    if (state.scale === "grid") {
        let targetLayer = null;
        layers.grid.eachLayer((layer) => {
            if (layer.__cell === item) targetLayer = layer;
        });
        if (targetLayer) {
            selectArea({ type: "grid", data: item, layer: targetLayer });
            if (options.fit !== false) map.fitBounds(targetLayer.getBounds(), { maxZoom: 13, padding: [50, 50] });
        }
        return;
    }

    const layerGroup = state.scale === "gu" ? layers.gu : layers.dong;
    let targetLayer = null;
    layerGroup.eachLayer((layer) => {
        if (layer.feature === item) targetLayer = layer;
    });
    if (targetLayer) {
        selectArea({ type: item.properties.__type, data: item, layer: targetLayer });
        if (options.fit !== false) map.fitBounds(targetLayer.getBounds(), { maxZoom: state.scale === "gu" ? 12 : 14, padding: [50, 50] });
    }
}

function currentItems() {
    if (state.scale === "gu") return guData.features;
    if (state.scale === "grid") return gridCells;
    return dongData.features;
}

function calculateMetrics(item) {
    const props = item.properties || {};
    const code = props.__code || item.id || "grid";
    const center = props.__center || item.center;
    const districtCode = props.__districtCode || item.districtCode || "00000";

    const density = 35 + hash01(`${code}:population`) * 65;
    const criticalLoad = 30 + hash01(`${districtCode}:critical`) * 55;
    const localBuffer = 22 + hash01(`${code}:buffer`) * 48;
    const shelterDensity = 28 + hash01(`${code}:shelter`) * 64;
    const redundancy = 25 + hash01(`${code}:redundancy`) * 55;
    const floodSensitivity = floodProxy(center, code);
    const heatSensitivity = heatProxy(center, code);

    const foodAccess = proximity(center, ASSETS.filter((a) => a.type === "food"), 13);
    const waterAccess = proximity(center, ASSETS.filter((a) => a.type === "water"), 12);
    const civilAccess = proximity(center, ASSETS.filter((a) => a.type === "civil" || a.type === "medical"), 10);
    const corridorAccess = corridorProximity(center);

    const stress = state.scenario;

    const foodScore = clamp(
        32 + foodAccess * 0.48 + corridorAccess * 0.2 + localBuffer * 0.16
        - density * 0.16
        - stress.logistics * 13
        - stress.road * 9
        - stress.rain * 5
    );

    const powerScore = clamp(
        70 + localBuffer * 0.22 + redundancy * 0.28
        - criticalLoad * 0.18
        - density * 0.11
        - heatSensitivity * 0.16
        - stress.powerDemand * 14
        - stress.heat * 9
        - stress.rain * 3
    );

    const waterScore = clamp(
        36 + waterAccess * 0.44 + localBuffer * 0.22 + redundancy * 0.15
        - density * 0.11
        - floodSensitivity * 0.1
        - stress.waterDemand * 12
        - stress.heat * 6
        - stress.rain * 5
    );

    const mobilityScore = clamp(
        35 + corridorAccess * 0.5 + redundancy * 0.28
        - floodSensitivity * 0.17
        - riverCrossingProxy(center) * 0.13
        - stress.road * 16
        - stress.rain * 10
        - stress.logistics * 5
    );

    const civilScore = clamp(
        34 + shelterDensity * 0.38 + civilAccess * 0.32 + localBuffer * 0.14
        - density * 0.12
        - stress.heat * 5
        - stress.rain * 5
        - stress.powerDemand * 4
        - stress.waterDemand * 4
    );

    return {
        food: metric(foodScore, [
            `보급거점 접근성 ${band(foodAccess)} · 생활물류 차질 ${VALUE_LABELS.logistics[stress.logistics]}`,
            `도로 지연 ${VALUE_LABELS.road[stress.road]} 조건에서 권역 보급축 의존도 반영`,
            `인구·수요 압력 모의값 ${band(density)}`
        ]),
        power: metric(powerScore, [
            `폭염 강도 ${VALUE_LABELS.heat[stress.heat]} · 전력수요 ${VALUE_LABELS.powerDemand[stress.powerDemand]}`,
            `핵심시설 전력 의존도 모의값 ${band(criticalLoad)}`,
            `지역 완충·중복성 모의값 ${band(redundancy)}`
        ]),
        water: metric(waterScore, [
            `비상급수 권역 접근성 ${band(waterAccess)} · 급수수요 ${VALUE_LABELS.waterDemand[stress.waterDemand]}`,
            `호우·침수 민감도 모의값 ${band(floodSensitivity)}`,
            `폭염 조건의 급수수요 상승분 반영`
        ]),
        mobility: metric(mobilityScore, [
            `이동·보급축 접근성 ${band(corridorAccess)} · 도로 지연 ${VALUE_LABELS.road[stress.road]}`,
            `집중호우에 따른 속도저하 및 우회수송 부담 반영`,
            `하천횡단·저지대 의존도 모의값 ${band(riverCrossingProxy(center))}`
        ]),
        civil: metric(civilScore, [
            `민방위·응급 권역 접근성 ${band(civilAccess)} · 대피수요 압력 ${band(density)}`,
            `대피·급수·응급시설의 동시가동 부담 반영`,
            `시설 밀도 모의값 ${band(shelterDensity)}`
        ])
    };
}

function metric(score, drivers) {
    return {
        score: Math.round(clamp(score)),
        drivers
    };
}

function classify(score) {
    if (score >= 66) {
        return { key: "good", label: "양호", className: "status-good", color: "#75b87a" };
    }
    if (score >= 43) {
        return { key: "watch", label: "주의", className: "status-watch", color: "#d6a348" };
    }
    return { key: "vulnerable", label: "취약", className: "status-vulnerable", color: "#d05e57" };
}

function tooltipHTML(item) {
    const metrics = calculateMetrics(item);
    const status = classify(metrics[state.domain].score);
    return `
        <strong>${displayName(item)}</strong><br>
        ${displayDistrict(item)} · ${DOMAINS[state.domain].label}<br>
        <span class="${status.className}">${status.label}</span>
    `;
}

function displayName(item) {
    if (item.properties) return item.properties.__name;
    return item.name;
}

function displayDistrict(item) {
    if (item.properties) return item.properties.__districtName;
    return item.districtName;
}

function geometryCenter(geometry) {
    const coords = [];
    collectCoords(geometry.coordinates, coords);
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    coords.forEach(([lng, lat]) => {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
    });
    return { lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 };
}

function collectCoords(input, output) {
    if (typeof input?.[0] === "number") {
        output.push(input);
        return;
    }
    input.forEach((child) => collectCoords(child, output));
}

function buildGridCells(boundaryGeoJSON) {
    const cells = [];
    const lngMin = 126.76;
    const lngMax = 127.20;
    const latMin = 37.42;
    const latMax = 37.71;
    const stepLng = 0.025;
    const stepLat = 0.018;
    let id = 1;

    for (let lat = latMin; lat < latMax; lat += stepLat) {
        for (let lng = lngMin; lng < lngMax; lng += stepLng) {
            const center = { lat: lat + stepLat / 2, lng: lng + stepLng / 2 };
            const district = findDistrictForPoint(center, boundaryGeoJSON);
            if (!district) continue;
            cells.push({
                id: `GRID-${String(id).padStart(3, "0")}`,
                name: `작전격자 ${String(id).padStart(3, "0")}`,
                districtCode: district.properties.__districtCode,
                districtName: district.properties.__districtName,
                center,
                bounds: [[lat, lng], [lat + stepLat, lng + stepLng]]
            });
            id += 1;
        }
    }
    return cells;
}

function findDistrictForPoint(center, geoJSON) {
    return geoJSON.features.find((feature) => pointInGeometry(center, feature.geometry));
}

function pointInGeometry(point, geometry) {
    if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates);
    if (geometry.type === "MultiPolygon") return geometry.coordinates.some((poly) => pointInPolygon(point, poly));
    return false;
}

function pointInPolygon(point, polygon) {
    const outer = polygon[0];
    let inside = false;
    const x = point.lng;
    const y = point.lat;
    for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
        const xi = outer[i][0];
        const yi = outer[i][1];
        const xj = outer[j][0];
        const yj = outer[j][1];
        const intersects = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
        if (intersects) inside = !inside;
    }
    return inside;
}

function proximity(center, points, decayKm) {
    const minDistance = points.reduce((min, point) => Math.min(min, distanceKm(center, point)), Infinity);
    return clamp(100 - (minDistance / decayKm) * 100);
}

function corridorProximity(center) {
    const points = CORRIDORS.flatMap((corridor) => corridor.coords.map(([lat, lng]) => ({ lat, lng })));
    return proximity(center, points, 8);
}

function distanceKm(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLng = (b.lng - a.lng) * rad;
    const lat1 = a.lat * rad;
    const lat2 = b.lat * rad;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function riverCrossingProxy(center) {
    const hanLat = 37.525;
    const nearHan = clamp(100 - Math.abs(center.lat - hanLat) * 1450);
    const westEast = center.lng > 126.94 && center.lng < 127.12 ? 20 : 0;
    return clamp(nearHan + westEast);
}

function floodProxy(center, code) {
    const nearHan = riverCrossingProxy(center);
    const lowland = center.lat < 37.55 ? 16 : 0;
    return clamp(nearHan * 0.55 + lowland + hash01(`${code}:flood`) * 36);
}

function heatProxy(center, code) {
    const denseUrban = center.lng > 126.92 && center.lng < 127.08 && center.lat > 37.48 && center.lat < 37.59 ? 28 : 8;
    return clamp(denseUrban + hash01(`${code}:heat`) * 58);
}

function hash01(value) {
    let hash = 2166136261;
    const string = String(value);
    for (let i = 0; i < string.length; i += 1) {
        hash ^= string.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
}

function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}

function band(value) {
    if (value >= 68) return "높음";
    if (value >= 38) return "중간";
    return "낮음";
}
