// Simple dashboard logic for output.json
// Uses vanilla JS: fetch data, build filters, render table, handle search/sort/detail

const state = {
  data: [],
  filtered: [],
  sort: { key: "filename", dir: "asc" },
  filters: {
    search: "",
    ext: "",
    tag: "",
    modules: [],
    contentType: "",
    processStep: "",
    language: "",
    hasImages: "",
  },
};

const el = {
  search: document.getElementById("searchInput"),
  ext: document.getElementById("extFilter"),
  tag: document.getElementById("tagFilter"),
  modules: document.getElementById("modulesFilter"),
  contentType: document.getElementById("contentTypeFilter"),
  processStep: document.getElementById("processStepFilter"),
  language: document.getElementById("languageFilter"),
  images: document.getElementById("imagesFilter"),
  tableBody: document.querySelector("#filesTable tbody"),
  tableHead: document.querySelector("#filesTable thead"),
  detail: document.getElementById("detailPanel"),
  detailFilename: document.getElementById("detailFilename"),
  detailPath: document.getElementById("detailPath"),
  detailSummary: document.getElementById("detailSummary"),
  detailMeta: document.getElementById("detailMeta"),
  detailModules: document.getElementById("detailModules"),
  detailBadges: document.getElementById("detailBadges"),
  detailLink: document.getElementById("detailLink"),
  closeDetail: document.getElementById("closeDetail"),
};

// Debounce helper
function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function uniqueSorted(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

async function loadData() {
  const res = await fetch("output.json");
  const json = await res.json();
  state.data = json.files || [];
  buildFilters();
  applyFilters();
}

function buildFilters() {
  const files = state.data;
  const fillSelect = (select, values, includeAll = true) => {
    const opts = includeAll ? [""] : [];
    opts.push(...uniqueSorted(values));
    select.innerHTML = "";
    opts.forEach((val) => {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = val || "All";
      select.appendChild(option);
    });
  };

  fillSelect(el.ext, files.map((f) => f.extension));
  fillSelect(el.tag, files.map((f) => f.tag));
  fillSelect(el.contentType, files.map((f) => f.content_type));
  fillSelect(el.processStep, files.map((f) => f.process_step));
  fillSelect(el.language, files.map((f) => f.language));

  // Modules multi-select
  const modules = uniqueSorted(files.flatMap((f) => f.modules_mentioned || []));
  el.modules.innerHTML = "";
  modules.forEach((m) => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    el.modules.appendChild(option);
  });
}

function getSelectedModules() {
  return Array.from(el.modules.selectedOptions).map((o) => o.value);
}

function applyFilters() {
  const { search, ext, tag, modules, contentType, processStep, language, hasImages } = state.filters;
  const q = search.trim().toLowerCase();

  state.filtered = state.data.filter((f) => {
    if (ext && f.extension !== ext) return false;
    if (tag && f.tag !== tag) return false;
    if (contentType && f.content_type !== contentType) return false;
    if (processStep && f.process_step !== processStep) return false;
    if (language && f.language !== language) return false;
    if (modules.length) {
      const mods = f.modules_mentioned || [];
      if (!modules.every((m) => mods.includes(m))) return false;
    }
    if (hasImages) {
      const wants = hasImages === "true";
      if (Boolean(f.contains_images) !== wants) return false;
    }
    if (q) {
      const haystack = [
        f.filename,
        f.summary,
        f.tag,
        f.content_type,
        f.process_step,
        f.language,
        (f.modules_mentioned || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  sortData();
  renderTable();
}

function sortData() {
  const { key, dir } = state.sort;
  const factor = dir === "asc" ? 1 : -1;
  state.filtered.sort((a, b) => {
    const va = (a[key] ?? "").toString().toLowerCase();
    const vb = (b[key] ?? "").toString().toLowerCase();
    if (va < vb) return -1 * factor;
    if (va > vb) return 1 * factor;
    return 0;
  });
}

function renderTable() {
  const tbody = el.tableBody;
  tbody.innerHTML = "";
  state.filtered.forEach((f, idx) => {
    const tr = document.createElement("tr");
    tr.dataset.index = idx;
    tr.innerHTML = `
      <td>${f.filename || ""}</td>
      <td>${f.tag || ""}</td>
      <td>${f.content_type || ""}</td>
      <td>${(f.modules_mentioned || []).join(", ")}</td>
      <td>${f.size_kb ?? ""}</td>
      <td>${f.page_count ?? ""}</td>
      <td class="summary-cell">${f.summary || ""}</td>
    `;
    tr.addEventListener("click", () => showDetail(f, tr));
    tbody.appendChild(tr);
  });
}

function showDetail(file, rowEl) {
  Array.from(el.tableBody.querySelectorAll("tr")).forEach((r) => r.classList.remove("active"));
  rowEl.classList.add("active");

  el.detailFilename.textContent = file.filename || "";
  el.detailPath.textContent = file.path || "";
  el.detailSummary.textContent = file.summary || "";
  el.detailLink.textContent = file.path || "";

  el.detailBadges.innerHTML = "";
  const badge = (label, value) => {
    if (!value) return;
    const span = document.createElement("span");
    span.className = "badge";
    span.textContent = `${label}: ${value}`;
    el.detailBadges.appendChild(span);
  };
  badge("Tag", file.tag);
  badge("Content", file.content_type);
  badge("Lang", file.language);
  badge("Version", file.version);
  badge("Images", file.contains_images ? "Yes" : "No");

  el.detailModules.innerHTML = "";
  (file.modules_mentioned || []).forEach((m) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = m;
    el.detailModules.appendChild(chip);
  });

  const metaEntries = {
    Extension: file.extension,
    "Size (KB)": file.size_kb,
    Pages: file.page_count,
    "Word count": file.word_count,
    "Process step": file.process_step,
    "Tables": file.tables_count,
    Complexity: file.complexity,
    "Created at": file.created_at,
    "Modified at": file.modified_at,
    Domain: file.domain,
  };
  el.detailMeta.innerHTML = "";
  Object.entries(metaEntries).forEach(([k, v]) => {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v ?? "";
    el.detailMeta.append(dt, dd);
  });

  el.detail.classList.remove("hidden");
}

function setupSorting() {
  el.tableHead.addEventListener("click", (e) => {
    const th = e.target.closest("th");
    if (!th || !th.dataset.sort) return;
    const key = th.dataset.sort;
    const dir = state.sort.key === key && state.sort.dir === "asc" ? "desc" : "asc";
    state.sort = { key, dir };
    applyFilters();
  });
}

function setupFilters() {
  el.ext.addEventListener("change", () => {
    state.filters.ext = el.ext.value;
    applyFilters();
  });
  el.tag.addEventListener("change", () => {
    state.filters.tag = el.tag.value;
    applyFilters();
  });
  el.modules.addEventListener("change", () => {
    state.filters.modules = getSelectedModules();
    applyFilters();
  });
  el.contentType.addEventListener("change", () => {
    state.filters.contentType = el.contentType.value;
    applyFilters();
  });
  el.processStep.addEventListener("change", () => {
    state.filters.processStep = el.processStep.value;
    applyFilters();
  });
  el.language.addEventListener("change", () => {
    state.filters.language = el.language.value;
    applyFilters();
  });
  el.images.addEventListener("change", () => {
    state.filters.hasImages = el.images.value;
    applyFilters();
  });
  el.search.addEventListener(
    "input",
    debounce((ev) => {
      state.filters.search = ev.target.value;
      applyFilters();
    }, 250)
  );
  el.closeDetail.addEventListener("click", () => {
    el.detail.classList.add("hidden");
    Array.from(el.tableBody.querySelectorAll("tr")).forEach((r) => r.classList.remove("active"));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupSorting();
  setupFilters();
  loadData().catch((err) => {
    console.error("Failed to load data", err);
    el.tableBody.innerHTML = `<tr><td colspan="7">Failed to load output.json</td></tr>`;
  });
});
