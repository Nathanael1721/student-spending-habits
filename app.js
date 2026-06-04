/* Student Spending — static dashboard logic (vanilla JS + Plotly.js) */
"use strict";

const SEG_COLORS = { "Frugal": "#34d399", "Balanced": "#38bdf8", "High spender": "#f87171" };
const TABS = [
  ["overview", "📋 Overview & Data"],
  ["descriptive", "📊 Descriptive"],
  ["segments", "🎯 Segments"],
  ["prediction", "🤖 Prediction"],
  ["financial", "💰 Financial analytics"],
  ["hypothesis", "🔬 Hypothesis tests"],
];
const FILTER_COLS = [
  ["gender", "Gender"], ["major", "Major"],
  ["year_in_school", "Year in school"], ["preferred_payment_method", "Payment method"],
];

let DATA = null;
const selected = {};      // col -> Set of chosen values
const rendered = {};      // tab -> bool (for one-time global tabs)

// ---------- helpers ----------
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const sum = a => a.reduce((x, y) => x + y, 0);
const fmt = (x, d = 0) => Number(x).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });

function gini(arr) {
  const x = [...arr].sort((a, b) => a - b);
  const n = x.length; if (!n) return 0;
  const tot = sum(x); let cum = 0, s = 0;
  for (let i = 0; i < n; i++) { cum += x[i]; s += cum; }
  return (n + 1 - 2 * s / tot) / n;
}

function baseLayout(title, extra = {}) {
  return Object.assign({
    title: { text: title, font: { size: 15 } },
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#e2e8f0", size: 12 },
    margin: { t: 44, r: 16, b: 44, l: 56 },
    legend: { orientation: "h", y: -0.18 },
    xaxis: { gridcolor: "#334155", zerolinecolor: "#334155" },
    yaxis: { gridcolor: "#334155", zerolinecolor: "#334155" },
  }, extra);
}
const CONF = { responsive: true, displayModeBar: false };
const draw = (id, traces, layout) => Plotly.react(id, traces, layout, CONF);

function counts(rows, col, order) {
  const m = {}; rows.forEach(r => { m[r[col]] = (m[r[col]] || 0) + 1; });
  const keys = order || Object.keys(m).sort();
  return { keys, vals: keys.map(k => m[k] || 0) };
}

// ---------- view (filtered rows) ----------
function getView() {
  return DATA.rows.filter(r =>
    FILTER_COLS.every(([c]) => selected[c].has(r[c])));
}

// ---------- sidebar ----------
function buildFilters() {
  const host = document.getElementById("filters");
  FILTER_COLS.forEach(([col, label]) => {
    selected[col] = new Set(DATA.meta.categoricals[col]);
    const h = document.createElement("h3"); h.textContent = label; host.appendChild(h);
    const box = document.createElement("div"); box.className = "filter-group";
    DATA.meta.categoricals[col].forEach(v => {
      const lab = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = true; cb.value = v;
      cb.onchange = () => {
        cb.checked ? selected[col].add(v) : selected[col].delete(v);
        onFilterChange();
      };
      lab.appendChild(cb); lab.appendChild(document.createTextNode(" " + v));
      box.appendChild(lab);
    });
    host.appendChild(box);
  });
}

function onFilterChange() {
  const view = getView();
  document.getElementById("filter-note").innerHTML =
    `<b>${view.length} / ${DATA.meta.n}</b> students selected`;
  renderOverview(view);
  renderDescriptive(view);
  renderFinancial(view);   // re-renders charts; what-if stays global
}

// ---------- tabs ----------
function buildTabs() {
  const host = document.getElementById("tabs");
  TABS.forEach(([id, label], i) => {
    const b = document.createElement("button");
    b.className = "tab-btn" + (i === 0 ? " active" : "");
    b.textContent = label; b.dataset.tab = id;
    b.onclick = () => activate(id);
    host.appendChild(b);
  });
}
function activate(id) {
  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === id));
  document.querySelectorAll(".panel").forEach(p =>
    p.classList.toggle("active", p.dataset.tab === id));
  // lazy render global tabs once
  if (id === "segments" && !rendered.segments) { renderSegments(); rendered.segments = true; }
  if (id === "prediction" && !rendered.prediction) { renderPrediction(); rendered.prediction = true; }
  if (id === "hypothesis" && !rendered.hypothesis) { renderHypothesis(); rendered.hypothesis = true; }
  // Plotly needs a resize when a hidden div becomes visible
  document.querySelectorAll(`.panel[data-tab="${id}"] .chart`).forEach(d => Plotly.Plots.resize(d));
}

// ---------- Tab 1: Overview ----------
function renderOverview(view) {
  const exp = view.map(r => r.monthly_expenses);
  const kpis = [
    ["Students", fmt(view.length)],
    ["In deficit", (mean(view.map(r => r.financial_stress)) * 100).toFixed(1) + "%"],
    ["Avg income", fmt(mean(view.map(r => r.monthly_income)))],
    ["Avg expenses", fmt(mean(exp))],
    ["Gini (spending)", view.length > 1 ? gini(exp).toFixed(3) : "—"],
  ];
  document.getElementById("kpis").innerHTML = kpis.map(
    ([l, v]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join("");

  // data table (all filtered rows)
  const cols = ["age", "gender", "year_in_school", "major", "monthly_income",
    "financial_aid", "tuition", ...DATA.meta.expense_cols, "preferred_payment_method",
    "monthly_expenses", "savings", "expense_ratio", "segment", "financial_health_score"];
  let html = "<table><thead><tr>" +
    cols.map(c => `<th class="${typeof view[0]?.[c] === "string" ? "cat" : ""}">${c}</th>`).join("") +
    "</tr></thead><tbody>";
  const body = view.map(r => "<tr>" + cols.map(c => {
    const v = r[c];
    const cls = typeof v === "string" ? "cat" : "";
    return `<td class="${cls}">${typeof v === "number" ? fmt(v, Number.isInteger(v) ? 0 : 2) : v}</td>`;
  }).join("") + "</tr>").join("");
  document.getElementById("table").innerHTML = html + body + "</tbody></table>";
}

function downloadCSV() {
  const view = getView();
  const cols = Object.keys(view[0]);
  const lines = [cols.join(",")].concat(
    view.map(r => cols.map(c => r[c]).join(",")));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "student_spending_filtered.csv"; a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Tab 2: Descriptive ----------
function renderDescriptive(view) {
  if (!view.length) return;
  const pie = (col) => {
    const { keys, vals } = counts(view, col, DATA.meta.categoricals[col]);
    return [{ type: "pie", labels: keys, values: vals, hole: 0.45, textinfo: "label+percent" }];
  };
  draw("c_gender", pie("gender"), baseLayout("Gender"));
  draw("c_year", pie("year_in_school"), baseLayout("Year in school"));

  const maj = counts(view, "major", DATA.meta.categoricals.major);
  draw("c_major", [{ type: "bar", x: maj.keys, y: maj.vals, marker: { color: "#38bdf8" } }],
    baseLayout("Major distribution"));
  const pay = counts(view, "preferred_payment_method", DATA.meta.categoricals.preferred_payment_method);
  draw("c_pay", [{ type: "bar", x: pay.keys, y: pay.vals, marker: { color: "#a78bfa" } }],
    baseLayout("Preferred payment method"));

  const m = DATA.meta.expense_cols
    .map(c => [c, mean(view.map(r => r[c]))]).sort((a, b) => a[1] - b[1]);
  draw("c_avgspend", [{
    type: "bar", orientation: "h", x: m.map(d => d[1]), y: m.map(d => d[0]),
    marker: { color: m.map(d => d[1]), colorscale: "Teal" }
  }], baseLayout("Average monthly spending by category"));

  const sav = view.map(r => r.savings);
  draw("c_savings", [{ type: "histogram", x: sav, nbinsx: 40, marker: { color: "#38bdf8" } }],
    baseLayout("Monthly savings distribution", {
      shapes: [{ type: "line", x0: 0, x1: 0, yref: "paper", y0: 0, y1: 1,
        line: { color: "#f87171", dash: "dash" } }]
    }));
}

// ---------- Tab 3: Segments (global) ----------
function renderSegments() {
  const rows = DATA.rows;
  const segs = Object.keys(SEG_COLORS);
  const c = counts(rows, "segment", segs);
  draw("c_segpie", [{
    type: "pie", labels: c.keys, values: c.vals, hole: 0.45,
    marker: { colors: c.keys.map(k => SEG_COLORS[k]) }, textinfo: "label+percent"
  }], baseLayout("Segment sizes"));

  const scatter = segs.map(s => {
    const r = rows.filter(x => x.segment === s);
    return {
      type: "scattergl", mode: "markers", name: s,
      x: r.map(d => d.monthly_expenses), y: r.map(d => d.savings),
      marker: { color: SEG_COLORS[s], size: 6, opacity: 0.7 },
    };
  });
  draw("c_segscatter", scatter, baseLayout("Expenses vs savings by segment", {
    xaxis: { title: "monthly_expenses", gridcolor: "#334155" },
    yaxis: { title: "savings", gridcolor: "#334155" },
    shapes: [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: 0, y1: 0, line: { color: "#94a3b8", dash: "dash" } }]
  }));

  const pca = segs.map(s => {
    const r = rows.filter(x => x.segment === s);
    return {
      type: "scattergl", mode: "markers", name: s,
      x: r.map(d => d.pca1), y: r.map(d => d.pca2),
      marker: { color: SEG_COLORS[s], size: 6, opacity: 0.7 },
    };
  });
  draw("c_pca", pca, baseLayout("PCA projection of segments", {
    xaxis: { title: "PC1", gridcolor: "#334155" }, yaxis: { title: "PC2", gridcolor: "#334155" }
  }));

  const p = DATA.segment_profile;
  const cols = ["segment", "count", "monthly_expenses", "savings", "expense_ratio",
    "essential_ratio", "discretionary_ratio", "financial_health_score"];
  document.getElementById("segtable").innerHTML =
    "<table><thead><tr>" + cols.map(c => `<th class="${c === "segment" ? "cat" : ""}">${c}</th>`).join("") +
    "</tr></thead><tbody>" + p.map(row => "<tr>" + cols.map(c =>
      `<td class="${c === "segment" ? "cat" : ""}">${typeof row[c] === "number" ? fmt(row[c], 2) : row[c]}</td>`
    ).join("") + "</tr>").join("") + "</tbody></table>";
}

// ---------- Tab 4: Prediction (global) ----------
function renderPrediction() {
  const M = DATA.models;
  const cols = ["model", "cv_auc", "test_auc", "test_acc"];
  document.getElementById("modeltable").innerHTML =
    "<table><thead><tr>" + cols.map(c => `<th class="${c === "model" ? "cat" : ""}">${c}</th>`).join("") +
    "</tr></thead><tbody>" + M.metrics.map(r => "<tr>" + cols.map(c =>
      `<td class="${c === "model" ? "cat" : ""}">${r[c]}</td>`).join("") + "</tr>").join("") +
    "</tbody></table>";

  const roc = Object.entries(M.roc).map(([name, d]) => ({
    type: "scatter", mode: "lines", name: `${name} (${d.auc})`, x: d.fpr, y: d.tpr
  }));
  roc.push({ type: "scatter", mode: "lines", x: [0, 1], y: [0, 1], showlegend: false,
    line: { dash: "dash", color: "#94a3b8" } });
  draw("c_roc", roc, baseLayout("ROC curves", {
    xaxis: { title: "False positive rate", gridcolor: "#334155" },
    yaxis: { title: "True positive rate", gridcolor: "#334155" }
  }));

  const imp = [...M.importance].reverse();
  draw("c_imp", [{
    type: "bar", orientation: "h", x: imp.map(d => d.importance), y: imp.map(d => d.feature),
    marker: { color: imp.map(d => d.importance), colorscale: "Sunset" }
  }], baseLayout("RandomForest feature importance"));

  draw("c_cm", [{
    type: "heatmap", z: M.confusion, colorscale: "Blues",
    x: ["No stress", "Stress"], y: ["No stress", "Stress"],
    text: M.confusion, texttemplate: "%{text}", showscale: false
  }], baseLayout("Confusion matrix (RandomForest)", {
    xaxis: { title: "predicted" }, yaxis: { title: "actual", autorange: "reversed" }
  }));
}

// ---------- Tab 5: Financial ----------
function renderFinancial(view) {
  if (!view.length) return;
  const segs = Object.keys(SEG_COLORS);
  const health = segs.map(s => ({
    type: "histogram", name: s, x: view.filter(r => r.segment === s).map(r => r.financial_health_score),
    marker: { color: SEG_COLORS[s] }, opacity: 0.8, nbinsx: 25
  }));
  draw("c_health", health, baseLayout("Financial Health Score (0–100)", { barmode: "stack" }));

  const res = view.map(r => r.monthly_resources);
  const needs = view.map(r => r.housing + r.food + r.transportation + r.health_wellness);
  const wants = view.map(r => r.entertainment + r.personal_care + r.technology + r.miscellaneous);
  const actual = [
    mean(needs.map((n, i) => n / res[i] * 100)),
    mean(wants.map((w, i) => w / res[i] * 100)),
    mean(view.map(r => r.savings / r.monthly_resources * 100)),
  ];
  draw("c_503020", [
    { type: "bar", name: "Actual", x: ["Needs", "Wants", "Savings"], y: actual, marker: { color: "#38bdf8" } },
    { type: "bar", name: "Ideal (50/30/20)", x: ["Needs", "Wants", "Savings"], y: [50, 30, 20], marker: { color: "#fbbf24" } },
  ], baseLayout("Budget allocation vs 50/30/20 rule", { barmode: "group", yaxis: { title: "% of resources", gridcolor: "#334155" } }));

  // Lorenz
  const xs = view.map(r => r.monthly_expenses).sort((a, b) => a - b);
  const tot = sum(xs); let cum = 0; const lor = [0];
  xs.forEach(v => { cum += v; lor.push(cum / tot); });
  const pop = lor.map((_, i) => i / (lor.length - 1));
  draw("c_lorenz", [
    { type: "scatter", mode: "lines", name: `Lorenz (Gini=${gini(xs).toFixed(3)})`, x: pop, y: lor, fill: "tozeroy" },
    { type: "scatter", mode: "lines", name: "equality", x: [0, 1], y: [0, 1], line: { dash: "dash", color: "#94a3b8" } },
  ], baseLayout("Lorenz curve of monthly spending", {
    xaxis: { title: "cumulative share of students", gridcolor: "#334155" },
    yaxis: { title: "cumulative share of spending", gridcolor: "#334155" }
  }));
}

// ---------- What-if (global, all rows) ----------
function renderWhatIf() {
  const incPct = +document.getElementById("incPct").value;
  const aidAdd = +document.getElementById("aidAdd").value;
  document.getElementById("incVal").textContent = incPct + "%";
  document.getElementById("aidVal").textContent = aidAdd;
  const rows = DATA.rows;
  const base = mean(rows.map(r => r.financial_stress)) * 100;
  const now = mean(rows.map(r => {
    const sav = r.monthly_income * (1 + incPct / 100) + r.financial_aid + aidAdd - r.monthly_expenses;
    return sav < 0 ? 1 : 0;
  })) * 100;
  const diff = (now - base).toFixed(1);
  document.getElementById("whatif").innerHTML = `
    <div class="kpi"><div class="v">${base.toFixed(1)}%</div><div class="l">Baseline deficit rate</div></div>
    <div class="kpi"><div class="v" style="color:${now <= base ? "#34d399" : "#f87171"}">${now.toFixed(1)}%</div>
      <div class="l">After intervention (${diff >= 0 ? "+" : ""}${diff} pp)</div></div>`;
}

// ---------- Tab 6: Hypothesis (global) ----------
function renderHypothesis() {
  const cols = ["test", "hypothesis", "statistic", "p_value", "result"];
  document.getElementById("hyptable").innerHTML =
    "<table><thead><tr>" + cols.map(c => `<th class="cat">${c}</th>`).join("") +
    "</tr></thead><tbody>" + DATA.hypothesis.map(r => "<tr>" + cols.map(c => {
      if (c === "result") {
        const isNull = r[c].includes("null") || r[c].includes("independent");
        return `<td class="cat"><span class="badge ${isNull ? "null" : "sig"}">${r[c]}</span></td>`;
      }
      return `<td class="cat">${r[c]}</td>`;
    }).join("") + "</tr>").join("") + "</tbody></table>";
}

// ---------- init ----------
fetch("data.json").then(r => r.json()).then(d => {
  DATA = d;
  document.getElementById("meta").textContent =
    `Data: ${d.meta.source} · ${d.meta.n} students · ${d.meta.deficit_rate}% in deficit · ` +
    `max raw correlation ${d.meta.raw_corr_max} (synthetic) · NTUT Data Science Final Project`;
  buildTabs();
  buildFilters();
  onFilterChange();           // overview + descriptive + financial
  renderWhatIf();
  document.getElementById("dl").onclick = downloadCSV;
  document.getElementById("incPct").oninput = renderWhatIf;
  document.getElementById("aidAdd").oninput = renderWhatIf;
}).catch(e => {
  document.getElementById("meta").textContent = "Failed to load data.json: " + e;
});
