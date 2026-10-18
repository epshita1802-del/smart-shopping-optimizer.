// Thin wrapper around Chart.js so pages stay short and charts are cleaned up between pages.
const PURPLE = "#6d4aff", SOFT = "#cfc3ff", GREY = "#cfd3dc", GREEN = "#1f9d6b";
export const COLORS = { PURPLE, SOFT, GREY, GREEN };
const PALETTE = [PURPLE, "#9b82ff", "#3b82f6", GREEN, "#f0a020", "#e0527a", "#14b8a6", "#8b5cf6"];
let charts = [];

export function destroyCharts() {
  charts.forEach((c) => c.destroy());
  charts = [];
}

function note(el, text) {
  const box = el.parentElement;
  box.classList.add("note");
  box.textContent = text;
}

/** Create a chart on <canvas id=...>. Shows a text note if Chart.js is missing or data is empty. */
export function makeChart(id, config, emptyText) {
  const el = document.getElementById(id);
  if (!el) return;
  if (emptyText) return note(el, emptyText);
  if (!window.Chart) return note(el, "Charts need an internet connection (Chart.js could not be loaded).");
  config.options = { responsive: true, maintainAspectRatio: false, ...config.options };
  charts.push(new window.Chart(el, config));
}

export const doughnut = (id, labels, data, colors, emptyText) =>
  makeChart(id, { type: "doughnut", data: { labels, datasets: [{ data, backgroundColor: colors }] },
    options: { cutout: "62%", plugins: { legend: { position: "bottom" } } } }, emptyText);

export const bar = (id, labels, data, colors, { horizontal = false, label = "" } = {}, emptyText) =>
  makeChart(id, { type: "bar", data: { labels, datasets: [{ label, data, backgroundColor: colors, borderRadius: 6 }] },
    options: { indexAxis: horizontal ? "y" : "x", plugins: { legend: { display: false } },
      scales: { [horizontal ? "x" : "y"]: { beginAtZero: true } } } }, emptyText);

export const palette = (n) => Array.from({ length: n }, (_, i) => PALETTE[i % PALETTE.length]);
