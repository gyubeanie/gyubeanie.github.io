const SNAPSHOT_URL = './data/nemotron-korea-snapshot.json';
const DEFAULT_PROVINCE = '\uC11C\uC6B8';
const PAGE_SIZE = 12;

const AGE_BUCKETS = [
  ['19-29', 19, 29],
  ['30-39', 30, 39],
  ['40-49', 40, 49],
  ['50-59', 50, 59],
  ['60-69', 60, 69],
  ['70-79', 70, 79],
  ['80-89', 80, 89],
  ['90+', 90, 200]
];

const state = {
  snapshot: null,
  province: DEFAULT_PROVINCE,
  district: 'all',
  sex: 'all',
  minAge: '',
  maxAge: '',
  query: '',
  page: 0
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
  bindElements();
  bindEvents();
  loadSnapshot();
});

function bindElements() {
  for (const id of [
    'sourceLink',
    'provinceSelect',
    'districtSelect',
    'sexSelect',
    'minAgeInput',
    'maxAgeInput',
    'searchInput',
    'clearButton',
    'totalRows',
    'provinceRowsLabel',
    'provinceRows',
    'provinceShare',
    'visibleSample',
    'statsMode',
    'districtTitle',
    'districtCount',
    'provinceChart',
    'districtChart',
    'sexChart',
    'ageChart',
    'housingChart',
    'educationChart',
    'sampleNote',
    'personaRows',
    'prevButton',
    'nextButton',
    'generatedAt'
  ]) {
    elements[id] = document.getElementById(id);
  }
}

function bindEvents() {
  elements.provinceSelect.addEventListener('change', (event) => {
    state.province = event.target.value;
    state.district = 'all';
    state.page = 0;
    render();
  });

  elements.districtSelect.addEventListener('change', (event) => {
    state.district = event.target.value;
    state.page = 0;
    render();
  });

  elements.sexSelect.addEventListener('change', (event) => {
    state.sex = event.target.value;
    state.page = 0;
    render();
  });

  elements.minAgeInput.addEventListener('input', (event) => {
    state.minAge = event.target.value;
    state.page = 0;
    render();
  });

  elements.maxAgeInput.addEventListener('input', (event) => {
    state.maxAge = event.target.value;
    state.page = 0;
    render();
  });

  elements.searchInput.addEventListener('input', (event) => {
    state.query = event.target.value;
    state.page = 0;
    render();
  });

  elements.clearButton.addEventListener('click', () => {
    state.province = DEFAULT_PROVINCE;
    state.district = 'all';
    state.sex = 'all';
    state.minAge = '';
    state.maxAge = '';
    state.query = '';
    state.page = 0;
    render();
  });

  elements.prevButton.addEventListener('click', () => {
    state.page = Math.max(0, state.page - 1);
    renderRows();
  });

  elements.nextButton.addEventListener('click', () => {
    state.page += 1;
    renderRows();
  });
}

async function loadSnapshot() {
  try {
    const response = await fetch(SNAPSHOT_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Snapshot request failed with status ${response.status}.`);
    }
    state.snapshot = await response.json();
    state.province = hasCount('province', DEFAULT_PROVINCE) ? DEFAULT_PROVINCE : firstProvince();
    render();
  } catch (error) {
    document.querySelector('.app-shell').innerHTML = `
      <div class="error-box">
        Unable to load the Nemotron snapshot. ${escapeHtml(error.message || String(error))}
      </div>
    `;
  }
}

function render() {
  if (!state.snapshot) {
    return;
  }

  elements.sourceLink.href = state.snapshot.source_url;
  renderControls();
  renderMetrics();
  renderCharts();
  renderRows();
  renderMetadata();
}

function renderControls() {
  setOptions(
    elements.provinceSelect,
    sortedBuckets(countsFor('province')).map(([label]) => [label, label]),
    state.province
  );

  const districtOptions = [['all', `All ${state.province}`]].concat(
    sortedBuckets(districtCountsForProvince(state.province)).map(([label]) => [
      label,
      shortDistrict(label)
    ])
  );
  setOptions(elements.districtSelect, districtOptions, state.district);

  const visibleRows = sampleRowsForProvince();
  const sexOptions = [['all', 'All']].concat(
    sortedBuckets(countsFromRows(visibleRows, 'sex')).map(([label]) => [label, label])
  );
  setOptions(elements.sexSelect, sexOptions, state.sex);

  elements.minAgeInput.value = state.minAge;
  elements.maxAgeInput.value = state.maxAge;
  elements.searchInput.value = state.query;
}

function renderMetrics() {
  const totalRows = state.snapshot.total_rows || 0;
  const provinceCount = countsFor('province')[state.province] || 0;
  const filtered = filteredRows();

  elements.totalRows.textContent = formatNumber(totalRows);
  elements.provinceRowsLabel.textContent = `${state.province} rows`;
  elements.provinceRows.textContent = formatNumber(provinceCount);
  elements.provinceShare.textContent = formatPercent(totalRows ? provinceCount / totalRows : 0);
  elements.visibleSample.textContent = `${formatNumber(filtered.length)} / ${formatNumber(sampleRowsForProvince().length)}`;
  elements.statsMode.textContent = state.snapshot.partial_statistics ? 'partial stats' : 'full stats';
}

function renderCharts() {
  const exactProvinceCounts = countsFor('province');
  const exactDistrictCounts = districtCountsForProvince(state.province);
  const rows = filteredRows();

  elements.districtTitle.textContent = `${state.province} district distribution`;
  elements.districtCount.textContent = `${formatNumber(Object.keys(exactDistrictCounts).length)} districts`;

  renderBarChart(elements.provinceChart, sortedBuckets(exactProvinceCounts), sumCounts(exactProvinceCounts), {
    limit: 20
  });
  renderBarChart(elements.districtChart, sortedBuckets(exactDistrictCounts), sumCounts(exactDistrictCounts), {
    limit: 30,
    labelFormatter: shortDistrict
  });
  renderBarChart(elements.sexChart, sortedBuckets(countsFromRows(rows, 'sex')), rows.length);
  renderBarChart(elements.ageChart, ageCounts(rows), rows.length, { preserveOrder: true });
  renderBarChart(elements.housingChart, sortedBuckets(countsFromRows(rows, 'housing_type')), rows.length, {
    limit: 10
  });
  renderBarChart(elements.educationChart, sortedBuckets(countsFromRows(rows, 'education_level')), rows.length, {
    limit: 10
  });
}

function renderRows() {
  const rows = filteredRows();
  const maxPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  state.page = Math.min(state.page, maxPage);
  const start = state.page * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  elements.prevButton.disabled = state.page === 0;
  elements.nextButton.disabled = state.page >= maxPage;
  elements.sampleNote.textContent = rows.length
    ? `${formatNumber(start + 1)}-${formatNumber(Math.min(start + PAGE_SIZE, rows.length))} of ${formatNumber(rows.length)} visible sample rows`
    : 'No sampled rows match the current filters.';

  elements.personaRows.innerHTML = pageRows.length
    ? pageRows.map(renderPersonaCard).join('')
    : '<div class="empty-note">No persona rows match this filter set in the static sample.</div>';
}

function renderMetadata() {
  const sample = state.snapshot.sample || {};
  const generated = new Date(state.snapshot.generated_at);
  const generatedText = Number.isNaN(generated.getTime())
    ? state.snapshot.generated_at
    : generated.toLocaleString();
  elements.generatedAt.textContent = `Snapshot generated ${generatedText}; sample strategy: ${sample.strategy || 'unknown'}, ${formatNumber((sample.rows || []).length)} compact rows from ${formatNumber(sample.scanned_pages || 0)} pages.`;
}

function renderBarChart(container, buckets, total, options = {}) {
  const limit = options.limit || 12;
  const visibleBuckets = buckets.slice(0, limit);
  const maxCount = Math.max(1, ...visibleBuckets.map(([, count]) => count));
  const labelFormatter = options.labelFormatter || ((label) => label);

  if (!visibleBuckets.length || total === 0) {
    container.innerHTML = '<div class="empty-note">No data in the current view.</div>';
    return;
  }

  container.innerHTML = visibleBuckets
    .map(([label, count]) => {
      const width = Math.max(3, (count / maxCount) * 100);
      const share = total ? count / total : 0;
      return `
        <div class="bar-row">
          <div class="bar-label">
            <span title="${escapeHtml(label)}">${escapeHtml(labelFormatter(label))}</span>
            <strong>${formatNumber(count)}</strong>
          </div>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width:${width}%"></div>
          </div>
          <span class="bar-share">${formatPercent(share)}</span>
        </div>
      `;
    })
    .join('');
}

function renderPersonaCard(row) {
  return `
    <article class="persona-card">
      <div class="persona-meta">
        <span>#${formatNumber(row.row_idx || 0)}</span>
        <span>${escapeHtml(row.district || 'unknown district')}</span>
        <span>${escapeHtml(String(row.age || '--'))} / ${escapeHtml(row.sex || '--')}</span>
      </div>
      <h3>${escapeHtml(row.persona || 'Untitled persona')}</h3>
      <p>${escapeHtml(row.professional_persona || row.cultural_background || 'No persona detail available.')}</p>
      <div class="persona-tags">
        <span>${escapeHtml(row.occupation || 'No occupation')}</span>
        <span>${escapeHtml(row.education_level || 'No education')}</span>
        <span>${escapeHtml(row.housing_type || 'No housing')}</span>
      </div>
    </article>
  `;
}

function setOptions(select, options, value) {
  select.innerHTML = options
    .map(([optionValue, label]) => {
      const selected = optionValue === value ? ' selected' : '';
      return `<option value="${escapeHtml(optionValue)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function filteredRows() {
  const minAge = state.minAge === '' ? null : Number(state.minAge);
  const maxAge = state.maxAge === '' ? null : Number(state.maxAge);
  const query = state.query.trim().toLowerCase();

  return sampleRowsForProvince().filter((row) => {
    if (state.district !== 'all' && row.district !== state.district) {
      return false;
    }
    if (state.sex !== 'all' && row.sex !== state.sex) {
      return false;
    }
    if (minAge !== null && Number(row.age) < minAge) {
      return false;
    }
    if (maxAge !== null && Number(row.age) > maxAge) {
      return false;
    }
    if (query && !searchText(row).includes(query)) {
      return false;
    }
    return true;
  });
}

function sampleRowsForProvince() {
  return sampleRows().filter((row) => row.province === state.province);
}

function sampleRows() {
  return state.snapshot?.sample?.rows || [];
}

function searchText(row) {
  return [
    row.persona,
    row.professional_persona,
    row.cultural_background,
    row.occupation,
    row.district,
    row.education_level,
    row.housing_type
  ]
    .join(' ')
    .toLowerCase();
}

function countsFor(field) {
  return state.snapshot?.statistics?.[field]?.frequencies || {};
}

function hasCount(field, label) {
  return Object.prototype.hasOwnProperty.call(countsFor(field), label);
}

function firstProvince() {
  return sortedBuckets(countsFor('province'))[0]?.[0] || DEFAULT_PROVINCE;
}

function districtCountsForProvince(province) {
  const prefix = `${province}-`;
  return Object.fromEntries(
    Object.entries(countsFor('district')).filter(([district]) => district.startsWith(prefix))
  );
}

function countsFromRows(rows, field) {
  const counts = {};
  for (const row of rows) {
    const value = row[field];
    if (value === undefined || value === null || value === '') {
      continue;
    }
    counts[String(value)] = (counts[String(value)] || 0) + 1;
  }
  return counts;
}

function ageCounts(rows) {
  const counts = Object.fromEntries(AGE_BUCKETS.map(([label]) => [label, 0]));
  for (const row of rows) {
    const age = Number(row.age);
    if (!Number.isFinite(age)) {
      continue;
    }
    const bucket = AGE_BUCKETS.find(([, min, max]) => age >= min && age <= max);
    if (bucket) {
      counts[bucket[0]] += 1;
    }
  }
  return AGE_BUCKETS.map(([label]) => [label, counts[label]]);
}

function sortedBuckets(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function sumCounts(counts) {
  return Object.values(counts).reduce((sum, count) => sum + Number(count || 0), 0);
}

function shortDistrict(label) {
  const pieces = String(label).split('-');
  return pieces.length > 1 ? pieces.slice(1).join('-') : label;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en').format(Number(value || 0));
}

function formatPercent(value) {
  return `${new Intl.NumberFormat('en', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 0.01 ? 2 : 0
  }).format(Number(value || 0) * 100)}%`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[character];
  });
}
