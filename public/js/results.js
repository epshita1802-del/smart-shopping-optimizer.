// Shared rendering for optimization results (used by the Dashboard and the Results page).
import { esc, inr } from "./utils.js";
import { bar, doughnut, COLORS, palette, rupee } from "./charts.js";

export function summaryCardsHtml(r) {
  const total = r.selected.length + r.not_selected.length;
  return `
  <div class="grid stats">
    <div class="card stat"><div class="label">Total budget</div><div class="num">${inr(r.budget)}</div></div>
    <div class="card stat"><div class="label">Total cost</div><div class="num">${inr(r.total_cost)}</div></div>
    <div class="card stat good"><div class="label">Remaining budget</div><div class="num">${inr(r.remaining_budget)}</div></div>
    <div class="card stat accent"><div class="label">Total value score</div><div class="num">${r.total_value}</div></div>
    <div class="card stat"><div class="label">Products selected</div><div class="num">${r.selected.length} <span class="muted" style="font-size:1rem;font-weight:500">/ ${total}</span></div></div>
    <div class="card stat"><div class="label">Budget utilization</div><div class="num">${r.utilization_pct}%</div>
      <div class="progress"><span style="width:${Math.min(r.utilization_pct, 100)}%"></span></div></div>
  </div>`;
}

export function chartsHtml(full) {
  // wide = the card stretches across the full row
  const box = (title, id, hint = "", wide = false) => `<div class="card"${wide ? ' style="grid-column: 1 / -1"' : ""}><h3>${title}</h3><div class="chart-box"><canvas id="${id}"></canvas></div>${hint ? `<p class="legend-note">${hint}</p>` : ""}</div>`;
  return `
  <div class="grid charts-grid">
    ${box("Budget utilization", "ch-util")}
    ${box("Category-wise spending", "ch-cat")}
    ${box("Shopping strategies: total value", "ch-strat",
      `<b style="color:${COLORS.PURPLE}">Purple</b> = dynamic programming (guaranteed best). <b style="color:#8d93a6">Grey</b> = simple baselines.`, !full)}
    ${full ? `<div class="card"><h3>Selected vs unselected products</h3><div class="chart-box" id="ch-sel-box"><canvas id="ch-sel"></canvas></div>
      <p class="legend-note"><b style="color:${COLORS.PURPLE}">Purple</b> = selected, <b style="color:#8d93a6">grey</b> = not selected (bars show priority score)</p></div>` : ""}
  </div>`;
}

const SHORT_NAMES = {
  dp: "Dynamic Programming",
  input_order: "Input order",
  highest_value: "Highest priority",
  best_ratio: "Best value per \u20B9",
};

export function drawCharts(r, full) {
  doughnut("ch-util", ["Spent", "Remaining"], [r.total_cost, r.remaining_budget], [COLORS.PURPLE, COLORS.SOFT],
    { center: r.utilization_pct + "%", sub: "of budget used" },
    r.budget > 0 ? "" : "Budget is zero, so there is nothing to show.");

  const cats = Object.keys(r.category_spending);
  bar("ch-cat", cats, cats.map((c) => r.category_spending[c]), palette(cats.length),
    { label: "Spent", format: rupee }, cats.length ? "" : "Nothing selected, so there is no category spending.");

  bar("ch-strat", r.strategies.map((s) => SHORT_NAMES[s.key] || s.name), r.strategies.map((s) => s.total_value),
    r.strategies.map((s) => (s.guaranteed_optimal ? COLORS.PURPLE : COLORS.GREY)),
    { horizontal: true, label: "Total value" });

  if (full) {
    const all = [...r.selected.map((p) => ({ ...p, sel: true })), ...r.not_selected.map((p) => ({ ...p, sel: false }))];
    const box = document.getElementById("ch-sel-box");
    if (box) box.style.height = Math.max(380, all.length * 36 + 60) + "px";
    bar("ch-sel", all.map((p) => p.name), all.map((p) => p.value), all.map((p) => (p.sel ? COLORS.PURPLE : COLORS.GREY)),
      { horizontal: true, label: "Priority score" }, all.length ? "" : "No products.");
  }
}

const productRows = (list) => list.map((p) => `
  <tr><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td class="num">${inr(p.price)}</td><td class="num">${p.value}</td></tr>`).join("");

const productTable = (list, emptyMsg) => list.length ? `
  <div class="table-wrap"><table class="data"><thead><tr><th>Product</th><th>Category</th><th class="num">Price</th><th class="num">Score</th></tr></thead>
  <tbody>${productRows(list)}</tbody></table></div>` : `<p class="muted">${emptyMsg}</p>`;

export function resultBodyHtml(r) {
  return `
  ${summaryCardsHtml(r)}
  <div class="callout"><b>Why this combination?</b><br>${esc(r.explanation)}</div>
  <div class="grid cols-2 section">
    <div class="card"><h2>Recommended products <span class="badge green">${r.selected.length}</span></h2>
      ${productTable(r.selected, "Nothing fits in this budget.")}</div>
    <div class="card"><h2>Not selected <span class="badge grey">${r.not_selected.length}</span></h2>
      ${productTable(r.not_selected, "Every product was selected.")}</div>
  </div>
  <div class="card section"><h2>Strategy comparison</h2>
    <p class="muted">The DP result maximizes the total assigned value subject to the budget. The other rows are simple
    baselines for comparison and are <b>not</b> necessarily optimal.</p>
    <div class="table-wrap"><table class="data"><thead><tr><th>Strategy</th><th class="num">Products</th><th class="num">Cost</th>
      <th class="num">Value</th><th class="num">Left over</th><th>Note</th></tr></thead><tbody>
      ${r.strategies.map((s) => `<tr class="${s.guaranteed_optimal ? "best" : ""}"><td><b>${esc(s.name)}</b></td>
        <td class="num">${s.count}</td><td class="num">${inr(s.total_cost)}</td><td class="num">${s.total_value}</td>
        <td class="num">${inr(s.remaining_budget)}</td><td>${esc(s.note)}</td></tr>`).join("")}
    </tbody></table></div></div>
  <div class="section">${chartsHtml(true)}</div>`;
}
