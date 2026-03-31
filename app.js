// Highest Grossing Films UI
// - Loads exported JSON (from SQLite) via fetch
// - Supports: search, country filter, year range, and click-to-sort
// - Renders both a table and a responsive "card view"

const DATA_URL = "./films.json";

/** @typedef {{ id:number, title:string, release_year:number|null, director:string|null, box_office:string|null, country:string|null, box_office_numeric:number|null }} Film */

const els = {
  q: document.getElementById("q"),
  country: document.getElementById("country"),
  yearMin: document.getElementById("yearMin"),
  yearMax: document.getElementById("yearMax"),
  reset: document.getElementById("reset"),
  toggleView: document.getElementById("toggleView"),
  tbody: document.getElementById("filmsTbody"),
  tableWrap: document.getElementById("tableWrap"),
  cards: document.getElementById("cards"),
  summaryPill: document.getElementById("summaryPill"),
  statusText: document.getElementById("statusText"),
  thBtns: Array.from(document.querySelectorAll(".thBtn")),
};

/** @type {Film[]} */
let allFilms = [];

const state = {
  sortKey: "box_office_numeric",
  sortDir: "desc",
  view: "table", // "table" | "cards"
};

function normStr(v) {
  return String(v ?? "").trim();
}

function safeInt(v) {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function compare(a, b) {
  if (a === b) return 0;
  if (a == null && b != null) return 1;
  if (a != null && b == null) return -1;
  return a < b ? -1 : 1;
}

function buildCountryOptions(films) {
  // Builds a unique list of countries for the dropdown.
  const values = new Set();
  for (const f of films) {
    const c = normStr(f.country);
    if (c) values.add(c);
  }
  const countries = ["All countries", ...Array.from(values).sort((a, b) => a.localeCompare(b))];

  els.country.innerHTML = "";
  for (const c of countries) {
    const opt = document.createElement("option");
    opt.value = c === "All countries" ? "" : c;
    opt.textContent = c;
    els.country.appendChild(opt);
  }
}

function applyFilters(films) {
  const q = normStr(els.q.value).toLowerCase();
  const country = normStr(els.country.value);
  const yearMin = safeInt(els.yearMin.value);
  const yearMax = safeInt(els.yearMax.value);

  return films.filter((f) => {
    if (q) {
      const hay = `${normStr(f.title)} ${normStr(f.director)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (country && normStr(f.country) !== country) return false;
    if (yearMin != null) {
      const y = f.release_year ?? null;
      if (y == null || y < yearMin) return false;
    }
    if (yearMax != null) {
      const y = f.release_year ?? null;
      if (y == null || y > yearMax) return false;
    }
    return true;
  });
}

function sortFilms(films) {
  const { sortKey, sortDir } = state;
  const dir = sortDir === "asc" ? 1 : -1;

  const getter =
    sortKey === "release_year"
      ? (f) => f.release_year
      : sortKey === "title"
        ? (f) => normStr(f.title).toLowerCase()
        : sortKey === "director"
          ? (f) => normStr(f.director).toLowerCase()
          : sortKey === "country"
            ? (f) => normStr(f.country).toLowerCase()
            : sortKey === "box_office"
              ? (f) => normStr(f.box_office).toLowerCase()
              : (f) => f.box_office_numeric;

  return [...films].sort((a, b) => dir * compare(getter(a), getter(b)));
}

function fmt(v, fallback = "—") {
  const s = normStr(v);
  return s ? s : fallback;
}

function renderTable(films) {
  if (!films.length) {
    els.tbody.innerHTML = `<tr><td colspan="5" class="loadingRow">No films match your filters.</td></tr>`;
    return;
  }

  const rows = films
    .map((f) => {
      const title = fmt(f.title);
      const year = f.release_year ?? "—";
      const director = fmt(f.director);
      const box = fmt(f.box_office);
      const country = fmt(f.country);

      return `
        <tr>
          <td><strong>${escapeHtml(title)}</strong></td>
          <td>${escapeHtml(String(year))}</td>
          <td>${escapeHtml(director)}</td>
          <td>${escapeHtml(box)}</td>
          <td>${escapeHtml(country)}</td>
        </tr>
      `;
    })
    .join("");

  els.tbody.innerHTML = rows;
}

function renderCards(films) {
  if (!films.length) {
    els.cards.innerHTML = `<div class="loadingRow">No films match your filters.</div>`;
    return;
  }

  els.cards.innerHTML = films
    .map((f) => {
      const title = fmt(f.title);
      const director = fmt(f.director);
      const year = f.release_year ?? "—";
      const box = fmt(f.box_office);
      const country = fmt(f.country);

      return `
        <article class="card">
          <h3 class="card__title">${escapeHtml(title)}</h3>
          <p class="card__meta">
            <strong>Director:</strong> ${escapeHtml(director)}<br />
            <strong>Year:</strong> ${escapeHtml(String(year))}
          </p>
          <div class="chipRow">
            <span class="chip chip--accent">${escapeHtml(box)}</span>
            <span class="chip">${escapeHtml(country)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function setSummary(filteredCount) {
  const total = allFilms.length;
  els.summaryPill.textContent = `${filteredCount.toLocaleString()} / ${total.toLocaleString()} films`;
}

function setStatusText(filteredCount) {
  const { sortKey, sortDir } = state;
  const sortLabel = sortKey === "box_office_numeric" ? "box office" : sortKey.replaceAll("_", " ");
  els.statusText.textContent = `Showing ${filteredCount.toLocaleString()} film(s), sorted by ${sortLabel} (${sortDir}).`;
}

function setSortUi() {
  // Reflect current sorting direction on header buttons.
  for (const btn of els.thBtns) {
    const key = btn.dataset.sort;
    const isActive =
      (state.sortKey === "box_office_numeric" && key === "box_office") || state.sortKey === key;
    btn.dataset.dir = isActive ? state.sortDir : "";
  }
}

function render() {
  const filtered = applyFilters(allFilms);
  const sorted = sortFilms(filtered);

  setSummary(sorted.length);
  setStatusText(sorted.length);
  setSortUi();

  if (state.view === "cards") {
    els.tableWrap.hidden = true;
    els.cards.hidden = false;
    renderCards(sorted);
  } else {
    els.cards.hidden = true;
    els.tableWrap.hidden = false;
    renderTable(sorted);
  }
}

function resetFilters() {
  els.q.value = "";
  els.country.value = "";
  els.yearMin.value = "";
  els.yearMax.value = "";
  render();
}

function toggleView() {
  state.view = state.view === "table" ? "cards" : "table";
  els.toggleView.textContent = state.view === "table" ? "Card view" : "Table view";
  render();
}

function onSortClick(key) {
  // Map "box_office" header to the numeric field for correct ordering.
  const normalizedKey = key === "box_office" ? "box_office_numeric" : key;

  if (state.sortKey === normalizedKey) {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
  } else {
    state.sortKey = normalizedKey;
    state.sortDir = normalizedKey === "box_office_numeric" ? "desc" : "asc";
  }
  render();
}

function escapeHtml(str) {
  // Basic escaping for HTML injection safety when rendering strings.
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load JSON (${res.status})`);

    const payload = await res.json();

    // Supports both shapes:
    // - { films: [...] } (recommended export shape)
    // - [...]           (raw array)
    allFilms = Array.isArray(payload) ? payload : payload.films ?? [];

    buildCountryOptions(allFilms);
    setSummary(allFilms.length);
    render();
  } catch (err) {
    els.tbody.innerHTML = `<tr><td colspan="5" class="loadingRow">Could not load data. Make sure you exported JSON and are serving the folder (not opening via file://).</td></tr>`;
    els.summaryPill.textContent = "Load failed";
    els.statusText.textContent = String(err?.message ?? err);
  }
}

// Input events re-render the UI based on current state/filters.
els.q.addEventListener("input", render);
els.country.addEventListener("change", render);
els.yearMin.addEventListener("input", render);
els.yearMax.addEventListener("input", render);
els.reset.addEventListener("click", resetFilters);
els.toggleView.addEventListener("click", toggleView);
for (const btn of els.thBtns) {
  btn.addEventListener("click", () => onSortClick(btn.dataset.sort));
}

init();
