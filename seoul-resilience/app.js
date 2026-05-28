const NS = "http://www.w3.org/2000/svg";

const DOMAIN_ORDER = ["food", "power", "water", "mobility", "civil"];

const DOMAINS = {
    food: {
        label: "식량·생활물류",
        title: "식량·생활물류 대비상태",
        short: "식",
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
        actions: [
            "대피시설·응급시설 밀도와 취약 인구 수요의 불일치 확인",
            "공공시설의 임시 대피·급수·냉방 전환계획 검토",
            "권역별 주민 안내·동원·수송 프로토콜 정비"
        ]
    }
};

const DISTRICT_NAMES = {
    "11110": "종로구", "11140": "중구", "11170": "용산구", "11200": "성동구", "11215": "광진구",
    "11230": "동대문구", "11260": "중랑구", "11290": "성북구", "11305": "강북구", "11320": "도봉구",
    "11350": "노원구", "11380": "은평구", "11410": "서대문구", "11440": "마포구", "11470": "양천구",
    "11500": "강서구", "11530": "구로구", "11545": "금천구", "11560": "영등포구", "11590": "동작구",
    "11620": "관악구", "11650": "서초구", "11680": "강남구", "11710": "송파구", "11740": "강동구"
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
    { name: "한강 남북 연계축", coords: [[37.556, 126.82], [37.544, 126.92], [37.522, 127.02], [37.518, 127.13]], color: "#5a8d50" },
    { name: "서남-동북 보급축", coords: [[37.468, 126.88], [37.514, 126.96], [37.566, 127.02], [37.64, 127.07]], color: "#b47a13" },
    { name: "도심-동남 응급축", coords: [[37.57, 126.98], [37.54, 127.04], [37.505, 127.11], [37.49, 127.16]], color: "#327da6" }
];

const state = {
    domain: "food",
    scale: "dong",
    base: "vector",
    scenario: { ...PRESETS.compound },
    overlays: { assets: true, corridors: true },
    selectedId: null
};

let dongData = null;
let guData = null;
let gridCells = [];
let liveData = null;
let bounds = null;
let svg = null;
let tooltip = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
        console.error("Seoul resilience dashboard failed:", error);
        showMapError(error);
    });
});

async function init() {
    $("#timestamp").textContent = new Intl.DateTimeFormat("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date());

    bindControls();

    const [neighborhoods, municipalities, liveSnapshot] = await Promise.all([
        fetchRequiredJSON("./data/seoul_neighborhoods_geo_simple.json"),
        fetchRequiredJSON("./data/seoul_municipalities_geo_simple.json"),
        fetchOptionalJSON("./data/seoul-live.json")
    ]);

    liveData = liveSnapshot;
    dongData = prepareGeoJSON(neighborhoods, "dong");
    guData = prepareGeoJSON(municipalities, "gu");
    bounds = computeBounds(guData.features);
    gridCells = buildGridCells(guData);

    renderLiveFeed();
    renderMapShell();
    renderAll();
    selectFirstPriority();
    document.querySelector(".map-loading")?.remove();
}

async function fetchRequiredJSON(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    return response.json();
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
        renderAll();
    });

    $$(".stress-control input").forEach((input) => {
        input.addEventListener("input", () => {
            state.scenario[input.dataset.scenario] = Number(input.value);
            setPresetActive(null);
            renderAll();
        });
    });

    $$(".preset-btn").forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.preset)));

    $("#scaleControls").addEventListener("click", (event) => {
        const button = event.target.closest("[data-scale]");
        if (!button) return;
        state.scale = button.dataset.scale;
        state.selectedId = null;
        $$("#scaleControls button").forEach((btn) => btn.classList.toggle("active", btn === button));
        $("#activeScaleLabel").textContent = state.scale === "dong" ? "행정동" : state.scale === "gu" ? "자치구" : "작전격자";
        renderAll();
        selectFirstPriority();
    });

    $("#baseControls").addEventListener("click", (event) => {
        const button = event.target.closest("[data-base]");
        if (!button) return;
        state.base = button.dataset.base;
        $$("#baseControls button").forEach((btn) => btn.classList.toggle("active", btn === button));
        updateMapBaseClass();
    });

    $$(".layer-toggles input[type='checkbox']").forEach((input) => {
        input.addEventListener("change", () => {
            state.overlays[input.dataset.overlay] = input.checked;
            renderMap();
        });
    });
}

function applyPreset(name) {
    state.scenario = { ...PRESETS[name] };
    setPresetActive(name);
    renderAll();
}

function setPresetActive(name) {
    $$(".preset-btn").forEach((button) => button.classList.toggle("active", button.dataset.preset === name));
}

function prepareGeoJSON(data, type) {
    data.features.forEach((feature, index) => {
        const props = feature.properties;
        props.__type = type;
        props.__code = type === "dong" ? props.EMD_CD : props.SIG_CD;
        props.__id = `${type}-${props.__code || index}`;
        props.__districtCode = type === "dong" ? String(props.EMD_CD).slice(0, 5) : props.SIG_CD;
        props.__name = type === "gu" ? (DISTRICT_NAMES[props.SIG_CD] || props.SIG_ENG_NM || props.SIG_CD) : (props.EMD_ENG_NM || props.EMD_CD);
        props.__districtName = DISTRICT_NAMES[props.__districtCode] || props.SIG_ENG_NM || "서울";
        props.__center = geometryCenter(feature.geometry);
    });
    return data;
}

function renderAll() {
    updateScenarioLabels();
    $("#mapTitle").textContent = DOMAINS[state.domain].title;
    renderMap();
    updateCounts();
    updatePriorityTable();
    renderSelectedInspector();
}

function updateScenarioLabels() {
    Object.entries(state.scenario).forEach(([key, value]) => {
        const label = document.querySelector(`[data-value-for="${key}"]`);
        if (label) label.textContent = VALUE_LABELS[key][value];
        const input = document.querySelector(`[data-scenario="${key}"]`);
        if (input && Number(input.value) !== value) input.value = String(value);
    });
}

function renderMapShell() {
    const mapEl = $("#map");
    mapEl.innerHTML = "";
    mapEl.classList.add("svg-map-host");
    updateMapBaseClass();

    tooltip = document.createElement("div");
    tooltip.className = "svg-tooltip";
    tooltip.hidden = true;

    svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "svg-map");
    svg.setAttribute("viewBox", "0 0 1000 760");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "서울 대비상태 SVG 지도");

    mapEl.appendChild(svg);
    mapEl.appendChild(tooltip);
}

function updateMapBaseClass() {
    const mapEl = $("#map");
    if (!mapEl) return;
    mapEl.classList.toggle("map-base-none", state.base === "none");
    mapEl.classList.toggle("map-base-vector", state.base === "vector");
    mapEl.classList.toggle("map-base-satellite", state.base === "satellite");
}

function renderMap() {
    if (!svg || !dongData || !guData) return;
    svg.replaceChildren();

    const bg = el("rect", { x: 0, y: 0, width: 1000, height: 760, class: "map-bg-rect" });
    svg.appendChild(bg);

    drawRiver();
    if (state.overlays.corridors) drawCorridors();

    const group = el("g", { class: `area-layer area-${state.scale}` });
    const items = currentItems();
    items.forEach((item) => group.appendChild(drawArea(item)));
    svg.appendChild(group);

    if (state.scale === "dong") drawGuBoundaries();
    if (state.overlays.assets) drawAssets();
}

function drawRiver() {
    const river = [[37.575, 126.78], [37.555, 126.86], [37.538, 126.94], [37.522, 127.02], [37.515, 127.10], [37.505, 127.18]];
    svg.appendChild(el("path", { d: linePath(river), class: "han-river" }));
}

function drawCorridors() {
    const group = el("g", { class: "corridor-layer" });
    CORRIDORS.forEach((corridor) => {
        const path = el("path", {
            d: linePath(corridor.coords),
            class: "corridor-line",
            style: `--corridor-color:${corridor.color}`
        });
        path.addEventListener("mousemove", (event) => showTooltip(event, `<strong>${corridor.name}</strong><br>이동·보급축 모의`));
        path.addEventListener("mouseleave", hideTooltip);
        group.appendChild(path);
    });
    svg.appendChild(group);
}

function drawAssets() {
    const group = el("g", { class: "asset-layer" });
    ASSETS.forEach((asset) => {
        const p = project({ lat: asset.lat, lng: asset.lng });
        const marker = el("g", { class: `svg-asset asset-${asset.type}`, transform: `translate(${p.x},${p.y})` });
        marker.appendChild(el("circle", { r: 10 }));
        const text = el("text", { "text-anchor": "middle", y: 3 });
        text.textContent = asset.code.split("-")[0];
        marker.appendChild(text);
        marker.addEventListener("mousemove", (event) => showTooltip(event, `<strong>${asset.name}</strong><br>${asset.code} · 권역집계/모의`));
        marker.addEventListener("mouseleave", hideTooltip);
        group.appendChild(marker);
    });
    svg.appendChild(group);
}

function drawGuBoundaries() {
    const group = el("g", { class: "gu-boundary-layer" });
    guData.features.forEach((feature) => {
        group.appendChild(el("path", { d: geometryPath(feature.geometry), class: "gu-boundary" }));
    });
    svg.appendChild(group);
}

function drawArea(item) {
    const metrics = calculateMetrics(item);
    const status = classify(metrics[state.domain].score);
    const selected = state.selectedId === getItemId(item);
    let shape;

    if (item.geometry) {
        shape = el("path", { d: geometryPath(item.geometry) });
    } else {
        const [sw, ne] = item.bounds;
        const p1 = project({ lat: sw[0], lng: sw[1] });
        const p2 = project({ lat: ne[0], lng: ne[1] });
        shape = el("rect", {
            x: Math.min(p1.x, p2.x),
            y: Math.min(p1.y, p2.y),
            width: Math.abs(p2.x - p1.x),
            height: Math.abs(p2.y - p1.y)
        });
    }

    shape.setAttribute("class", `area-shape ${status.key} ${selected ? "selected" : ""}`);
    shape.setAttribute("tabindex", "0");
    shape.setAttribute("role", "button");
    shape.setAttribute("aria-label", `${displayName(item)} ${DOMAINS[state.domain].label} ${status.label}`);
    shape.addEventListener("click", () => selectItem(item));
    shape.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectItem(item);
        }
    });
    shape.addEventListener("mousemove", (event) => showTooltip(event, tooltipHTML(item)));
    shape.addEventListener("mouseleave", hideTooltip);
    return shape;
}

function showTooltip(event, html) {
    if (!tooltip) return;
    tooltip.innerHTML = html;
    tooltip.hidden = false;
    const host = $("#map").getBoundingClientRect();
    tooltip.style.left = `${event.clientX - host.left + 12}px`;
    tooltip.style.top = `${event.clientY - host.top + 12}px`;
}

function hideTooltip() {
    if (tooltip) tooltip.hidden = true;
}

function selectItem(item) {
    state.selectedId = getItemId(item);
    renderMap();
    renderSelectedInspector();
}

function selectFirstPriority() {
    const first = currentItems()
        .map((item) => ({ item, score: calculateMetrics(item)[state.domain].score }))
        .sort((a, b) => a.score - b.score)[0];
    if (first) selectItem(first.item);
}

function renderSelectedInspector() {
    const item = currentItems().find((candidate) => getItemId(candidate) === state.selectedId);
    if (!item) {
        $("#selectedName").textContent = "지역 선택 대기";
        $("#selectedMeta").textContent = "지도에서 행정동·자치구·격자를 선택하십시오.";
        $("#domainReadiness").innerHTML = "";
        $("#driversList").innerHTML = "<li>선택 지역의 기능별 대비상태가 표시됩니다.</li>";
        $("#actionsList").innerHTML = "<li>취약 기능을 선택하면 검토 항목이 갱신됩니다.</li>";
        return;
    }

    const metrics = calculateMetrics(item);
    $("#selectedName").textContent = displayName(item);
    $("#selectedMeta").textContent = `${state.scale === "dong" ? "행정동/법정동" : state.scale === "gu" ? "자치구" : "작전격자"} · ${displayDistrict(item)} · ${getItemId(item)}`;

    $("#domainReadiness").innerHTML = DOMAIN_ORDER.map((key) => {
        const metric = metrics[key];
        const status = classify(metric.score);
        return `
            <div class="readiness-card">
                <div class="readiness-row">
                    <span class="readiness-name">${DOMAINS[key].label}</span>
                    <span class="status-pill ${status.className}">${status.label}</span>
                </div>
                <div class="bar-track"><div class="bar-fill ${status.className}" style="width:${metric.score}%"></div></div>
            </div>`;
    }).join("");

    $("#driversList").innerHTML = metrics[state.domain].drivers.map((driver) => `<li>${driver}</li>`).join("");
    const vulnerable = DOMAIN_ORDER.filter((key) => classify(metrics[key].score).key === "vulnerable").slice(0, 2);
    const actions = vulnerable.length ? vulnerable.flatMap((key) => DOMAINS[key].actions.slice(0, 2)) : DOMAINS[state.domain].actions;
    $("#actionsList").innerHTML = actions.slice(0, 4).map((action) => `<li>${action}</li>`).join("");
}

function updateCounts() {
    const counts = { good: 0, watch: 0, vulnerable: 0 };
    currentItems().forEach((item) => {
        counts[classify(calculateMetrics(item)[state.domain].score).key] += 1;
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
            </tr>`;
    }).join("");

    $$("#priorityRows tr").forEach((tr, index) => tr.addEventListener("click", () => selectItem(rows[index].item)));
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
    $("#rainFeedValue").textContent = rainfall.ok ? `${rainSummary.station_count ?? 0}개소 · 최대 ${formatValue(rainSummary.max_mm, "mm")}` : "자료대기";
    $("#riverFeedValue").textContent = river.ok ? `${riverSummary.station_count ?? 0}개소 · 최고 ${formatValue(riverSummary.max_level_m, "m")}` : "자료대기";
    $("#liveFeedTime").textContent = liveData.generated_at ? `최근 스냅샷: ${formatTimestamp(liveData.generated_at)} · 키 비공개` : "GitHub Actions 자료 갱신 대기 중";
    if (liveData.generated_at) $("#timestamp").textContent = formatTimestamp(liveData.generated_at, { compact: true });
}

function currentItems() {
    if (state.scale === "gu") return guData.features;
    if (state.scale === "grid") return gridCells;
    return dongData.features;
}

function getItemId(item) {
    return item.properties?.__id || item.id;
}

function displayName(item) {
    return item.properties?.__name || item.name;
}

function displayDistrict(item) {
    return item.properties?.__districtName || item.districtName;
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

    return {
        food: metric(32 + foodAccess * 0.48 + corridorAccess * 0.2 + localBuffer * 0.16 - density * 0.16 - stress.logistics * 13 - stress.road * 9 - stress.rain * 5, [
            `보급거점 접근성 ${band(foodAccess)} · 생활물류 차질 ${VALUE_LABELS.logistics[stress.logistics]}`,
            `도로 지연 ${VALUE_LABELS.road[stress.road]} 조건에서 권역 보급축 의존도 반영`,
            `인구·수요 압력 모의값 ${band(density)}`
        ]),
        power: metric(70 + localBuffer * 0.22 + redundancy * 0.28 - criticalLoad * 0.18 - density * 0.11 - heatSensitivity * 0.16 - stress.powerDemand * 14 - stress.heat * 9 - stress.rain * 3, [
            `폭염 강도 ${VALUE_LABELS.heat[stress.heat]} · 전력수요 ${VALUE_LABELS.powerDemand[stress.powerDemand]}`,
            `핵심시설 전력 의존도 모의값 ${band(criticalLoad)}`,
            `지역 완충·중복성 모의값 ${band(redundancy)}`
        ]),
        water: metric(36 + waterAccess * 0.44 + localBuffer * 0.22 + redundancy * 0.15 - density * 0.11 - floodSensitivity * 0.1 - stress.waterDemand * 12 - stress.heat * 6 - stress.rain * 5, [
            `비상급수 권역 접근성 ${band(waterAccess)} · 급수수요 ${VALUE_LABELS.waterDemand[stress.waterDemand]}`,
            `호우·침수 민감도 모의값 ${band(floodSensitivity)}`,
            `폭염 조건의 급수수요 상승분 반영`
        ]),
        mobility: metric(35 + corridorAccess * 0.5 + redundancy * 0.28 - floodSensitivity * 0.17 - riverCrossingProxy(center) * 0.13 - stress.road * 16 - stress.rain * 10 - stress.logistics * 5, [
            `이동·보급축 접근성 ${band(corridorAccess)} · 도로 지연 ${VALUE_LABELS.road[stress.road]}`,
            `집중호우에 따른 속도저하 및 우회수송 부담 반영`,
            `하천횡단·저지대 의존도 모의값 ${band(riverCrossingProxy(center))}`
        ]),
        civil: metric(34 + shelterDensity * 0.38 + civilAccess * 0.32 + localBuffer * 0.14 - density * 0.12 - stress.heat * 5 - stress.rain * 5 - stress.powerDemand * 4 - stress.waterDemand * 4, [
            `민방위·응급 권역 접근성 ${band(civilAccess)} · 대피수요 압력 ${band(density)}`,
            `대피·급수·응급시설의 동시가동 부담 반영`,
            `시설 밀도 모의값 ${band(shelterDensity)}`
        ])
    };
}

function metric(score, drivers) {
    return { score: Math.round(clamp(score)), drivers };
}

function classify(score) {
    if (score >= 66) return { key: "good", label: "양호", className: "status-good", color: "#4f9a55" };
    if (score >= 43) return { key: "watch", label: "주의", className: "status-watch", color: "#c58d23" };
    return { key: "vulnerable", label: "취약", className: "status-vulnerable", color: "#c4534b" };
}

function tooltipHTML(item) {
    const metrics = calculateMetrics(item);
    const status = classify(metrics[state.domain].score);
    return `<strong>${displayName(item)}</strong><br>${displayDistrict(item)} · ${DOMAINS[state.domain].label}<br><span class="${status.className}">${status.label}</span>`;
}

function geometryPath(geometry) {
    if (geometry.type === "Polygon") return polygonPath(geometry.coordinates);
    if (geometry.type === "MultiPolygon") return geometry.coordinates.map(polygonPath).join(" ");
    return "";
}

function polygonPath(polygon) {
    return polygon.map((ring) => ring.map(([lng, lat], index) => {
        const p = project({ lat, lng });
        return `${index === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(" ") + " Z").join(" ");
}

function linePath(coords) {
    return coords.map(([lat, lng], index) => {
        const p = project({ lat, lng });
        return `${index === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(" ");
}

function project(point) {
    const pad = 42;
    const w = 1000 - pad * 2;
    const h = 760 - pad * 2;
    return {
        x: pad + ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * w,
        y: pad + ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * h
    };
}

function computeBounds(features) {
    const coords = [];
    features.forEach((feature) => collectCoords(feature.geometry.coordinates, coords));
    return coords.reduce((acc, [lng, lat]) => ({
        minLng: Math.min(acc.minLng, lng),
        maxLng: Math.max(acc.maxLng, lng),
        minLat: Math.min(acc.minLat, lat),
        maxLat: Math.max(acc.maxLat, lat)
    }), { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity });
}

function geometryCenter(geometry) {
    const coords = [];
    collectCoords(geometry.coordinates, coords);
    const b = coords.reduce((acc, [lng, lat]) => ({
        minLng: Math.min(acc.minLng, lng),
        maxLng: Math.max(acc.maxLng, lng),
        minLat: Math.min(acc.minLat, lat),
        maxLat: Math.max(acc.maxLat, lat)
    }), { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity });
    return { lng: (b.minLng + b.maxLng) / 2, lat: (b.minLat + b.maxLat) / 2 };
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
    const lngMin = 126.76, lngMax = 127.20, latMin = 37.42, latMax = 37.71;
    const stepLng = 0.025, stepLat = 0.018;
    let id = 1;
    for (let lat = latMin; lat < latMax; lat += stepLat) {
        for (let lng = lngMin; lng < lngMax; lng += stepLng) {
            const center = { lat: lat + stepLat / 2, lng: lng + stepLng / 2 };
            const district = boundaryGeoJSON.features.find((feature) => pointInGeometry(center, feature.geometry));
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
        const xi = outer[i][0], yi = outer[i][1], xj = outer[j][0], yj = outer[j][1];
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
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function riverCrossingProxy(center) {
    const nearHan = clamp(100 - Math.abs(center.lat - 37.525) * 1450);
    const westEast = center.lng > 126.94 && center.lng < 127.12 ? 20 : 0;
    return clamp(nearHan + westEast);
}

function floodProxy(center, code) {
    const lowland = center.lat < 37.55 ? 16 : 0;
    return clamp(riverCrossingProxy(center) * 0.55 + lowland + hash01(`${code}:flood`) * 36);
}

function heatProxy(center, code) {
    const denseUrban = center.lng > 126.92 && center.lng < 127.08 && center.lat > 37.48 && center.lat < 37.59 ? 28 : 8;
    return clamp(denseUrban + hash01(`${code}:heat`) * 58);
}

function hash01(value) {
    let hash = 2166136261;
    for (let i = 0; i < String(value).length; i += 1) {
        hash ^= String(value).charCodeAt(i);
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

function showMapError(error) {
    const loader = document.querySelector(".map-loading") || $("#map");
    if (!loader) return;
    loader.innerHTML = `
        <div class="map-error">
            <strong>지도 초기화 실패</strong>
            경계자료 또는 앱 스크립트를 불러오지 못했습니다.<br>
            <small>${escapeHTML(error?.message || "Unknown error")}</small>
        </div>`;
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
}

function el(name, attrs = {}) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
}
