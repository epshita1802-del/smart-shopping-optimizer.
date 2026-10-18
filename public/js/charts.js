// Thin wrapper around Chart.js so pages stay short and charts are cleaned up between pages.
import { inr } from "./utils.js";

const PURPLE = "#6d4aff", SOFT = "#e4dcff", GREY = "#d5d9e3", GREEN = "#059669";
export const COLORS = { PURPLE, SOFT, GREY, GREEN };
const PALETTE = [PURPLE, "#9b82ff", "#3b82f6", GREEN, "#f59e0b", "#e0527a", "#14b8a6", "#8b5cf6"];
export const rupee = (n) => inr(n);
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

// Plugin: writes the value at the end of each bar.
const valueLabels = {
  id: "valueLabels",
  afterDatasetsDraw(chart, _args, opts) {
    if (!opts || !opts.show) return;
    const { ctx } = chart;
    const horizontal = chart.options.indexAxis === "y";
    ctx.save();
    ctx.font = "600 12px Inter, 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#0f172a";
    chart.getDatasetMeta(0).data.forEach((el, i) => {
      const v = chart.data.datasets[0].data[i];
      const text = opts.format ? opts.format(v) : String(v);
      if (horizontal) {
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(text, el.x + 6, el.y);
      } else {
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(text, el.x, el.y - 4);
      }
    });
    ctx.restore();
  },
};

// Plugin: writes text in the middle of a doughnut.
const centerText = {
  id: "centerText",
  afterDraw(chart, _args, opts) {
    if (!opts || !opts.text) return;
    const { ctx, chartArea: { left, right, top, bottom } } = chart;
    const x = (left + right) / 2, y = (top + bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = PURPLE;
    ctx.font = "700 32px Inter, 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(opts.text, x, y - 8);
    ctx.fillStyle = "#64748b";
    ctx.font = "500 13px Inter, 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(opts.sub || "", x, y + 20);
    ctx.restore();
  },
};

/** Create a chart on <canvas id=...>. Shows a text note if Chart.js is missing or data is empty. */
export function makeChart(id, config, emptyText) {
  const el = document.getElementById(id);
  if (!el) return;
  if (emptyText) return note(el, emptyText);
  if (!window.Chart) return note(el, "Charts need an internet connection (Chart.js could not be loaded).");
  window.Chart.defaults.font.family = "Inter, 'Segoe UI', system-ui, sans-serif";
  window.Chart.defaults.color = "#64748b";
  config.plugins = [valueLabels, centerText];
  config.options = { responsive: true, maintainAspectRatio: false, ...config.options };
  charts.push(new window.Chart(el, config));
}

export const doughnut = (id, labels, data, colors, { center = "", sub = "" } = {}, emptyText) =>
  makeChart(id, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, spacing: 2, borderRadius: 6 }] },
    options: {
      cutout: "72%",
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", padding: 16 } },
        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${rupee(c.parsed)}` } },
        centerText: { text: center, sub },
      },
    },
  }, emptyText);

export const bar = (id, labels, data, colors, { horizontal = false, label = "", format = null } = {}, emptyText) => {
  const axis = {
    beginAtZero: true, grace: "12%", border: { display: false },
    grid: { color: "#eef0f6" }, ticks: { callback: (v) => (format ? format(v) : v) },
  };
  const category = { grid: { display: false }, border: { display: false } };
  return makeChart(id, {
    type: "bar",
    data: { labels, datasets: [{ label, data, backgroundColor: colors, borderRadius: 8, borderSkipped: false, maxBarThickness: horizontal ? 24 : 44 }] },
    options: {
      indexAxis: horizontal ? "y" : "x",
      layout: { padding: horizontal ? { right: 48 } : { top: 20 } },
      plugins: {
        legend: { display: false },
        valueLabels: { show: true, format },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed[horizontal ? "x" : "y"];
              return ` ${label ? label + ": " : ""}${format ? format(v) : v}`;
            },
          },
        },
      },
      scales: horizontal ? { x: axis, y: category } : { y: axis, x: category },
    },
  }, emptyText);
};

export const palette = (n) => Array.from({ length: n }, (_, i) => PALETTE[i % PALETTE.length]);
