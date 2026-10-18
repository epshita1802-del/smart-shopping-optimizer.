import { api } from "../api.js";
import { $, $$, esc, inr, toast, emptyHtml } from "../utils.js";

const MAX_PRODUCTS = 8;

export async function visualizer(app, _p, isCurrent) {
  const products = await api.listProducts();
  if (!isCurrent()) return;
  if (!products.length) {
    app.innerHTML = `<div class="page-head"><h1>DP Visualizer</h1></div>` + emptyHtml("No products yet", "Add products to visualize the algorithm.", "#/product/new", "Add product");
    return;
  }
  const defaults = new Set(products.slice(0, 5).map((p) => p.id));
  let timer = null;
  let data = null, steps = [], idx = 0;

  app.innerHTML = `
  <div class="page-head"><div><h1>DP Algorithm Visualizer</h1>
    <p>Watch the table fill one cell at a time, then follow the backtracking to find the chosen products.</p></div></div>
  <form class="card" id="vf" novalidate>
    <div class="grid cols-3">
      <div class="field"><label for="v-budget">Budget (rupees)</label><input id="v-budget" type="number" min="0" step="1" value="10000"></div>
      <div class="field"><label for="v-unit">Table unit (1 column = ... rupees)</label>
        <select id="v-unit">${[1, 100, 250, 500, 1000, 2000].map((u) => `<option value="${u}" ${u === 500 ? "selected" : ""}>${inr(u)}</option>`).join("")}</select></div>
      <div class="field" style="align-self:end"><button class="btn" type="submit" id="v-go">Build table</button></div>
    </div>
    <label>Products (choose 1 to ${MAX_PRODUCTS})</label>
    <div class="checklist">${products.map((p) => `<label><input type="checkbox" value="${p.id}" ${defaults.has(p.id) ? "checked" : ""}> ${esc(p.name)} <span class="muted">${inr(p.price)} &middot; ${p.value}</span></label>`).join("")}</div>
    <p class="legend-note">A real budget would need thousands of columns. To keep the table readable, prices are rounded <b>up</b> to whole units and the budget <b>down</b>,
      so the answer is always affordable. Choose a unit of ${inr(1)} for the exact (but very wide) table.</p>
  </form>
  <div id="viz" class="section"></div>`;

  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

  $("#vf", app).addEventListener("submit", async (e) => {
    e.preventDefault();
    stop();
    const raw = $("#v-budget", app).value.trim();
    const ids = $$(".checklist input:checked", app).map((i) => Number(i.value));
    if (!/^\d+$/.test(raw)) return toast("Budget must be a whole number of rupees (0 or more).", "error");
    if (!ids.length || ids.length > MAX_PRODUCTS) return toast(`Select between 1 and ${MAX_PRODUCTS} products.`, "error");
    const btn = $("#v-go", app);
    btn.disabled = true;
    try {
      data = await api.visualize(Number(raw), Number($("#v-unit", app).value), ids);
      steps = buildSteps(data);
      idx = 0;
      render();
    } catch (err) { toast(err.message, "error"); }
    btn.disabled = false;
  });

  // ---- steps: every table cell in order, then the backtracking path, then "done" ----
  function buildSteps(d) {
    const s = [];
    for (let i = 1; i <= d.products.length; i++) for (let w = 0; w <= d.budget; w++) s.push({ t: "fill", i, w });
    d.backtrack_steps.forEach((b) => s.push({ t: "back", ...b }));
    s.push({ t: "done" });
    return s;
  }

  function describe(step) {
    const { products, dp_table: dp, budget, unit } = data;
    if (!step) {
      return `<b>Start.</b> The table has one row per product (row 0 = no products yet, all zeros) and one column per budget value from 0 to ${budget}${unit > 1 ? ` (1 unit = ${inr(unit)})` : ""}.
        Each cell answers: <i>"What is the best total score using the first i products with this much budget?"</i> Press <b>Next Step</b>.`;
    }
    if (step.t === "fill") {
      const p = products[step.i - 1];
      const above = dp[step.i - 1][step.w];
      if (p.price > step.w) {
        return `<b>Row ${step.i}: ${esc(p.name)}</b> (cost ${p.price}, score ${p.value}), budget ${step.w}.<br>
          It costs ${p.price} but we only have ${step.w}, so we <b>cannot buy it</b>. Copy the value from the cell above: <b>${above}</b>.`;
      }
      const left = dp[step.i - 1][step.w - p.price];
      const buy = p.value + left;
      return `<b>Row ${step.i}: ${esc(p.name)}</b> (cost ${p.price}, score ${p.value}), budget ${step.w}.<br>
        <span style="color:#b97a00"><b>Skip:</b></span> keep the value above = ${above}.<br>
        <span style="color:#2563eb"><b>Buy:</b></span> score ${p.value} + best with the leftover budget ${step.w - p.price} (blue cell) = ${p.value} + ${left} = ${buy}.<br>
        We keep the larger: <b>${dp[step.i][step.w]}</b> &rarr; ${buy > above ? "<b>buy</b> it" : "<b>skip</b> it" + (buy === above ? " (tie, skipping is simpler)" : "")}.`;
    }
    if (step.t === "back") {
      const p = products[step.i - 1];
      const here = dp[step.i][step.w], above = dp[step.i - 1][step.w];
      return step.took
        ? `<b>Backtrack at row ${step.i}, budget ${step.w}.</b><br>${here} is different from the ${above} above, so <b>${esc(p.name)} was bought</b>.
           Remove its cost: budget becomes ${step.w - p.price}.`
        : `<b>Backtrack at row ${step.i}, budget ${step.w}.</b><br>${here} equals the ${above} above, so <b>${esc(p.name)} was not needed</b>. Budget stays ${step.w}.`;
    }
    const chosen = data.selected_indices.map((i) => products[i]);
    return `<b>Done!</b> Best total score: <b>${data.total_value}</b>.<br>
      Selected: ${chosen.length ? chosen.map((p) => esc(p.name)).join(", ") : "nothing"}.<br>
      Real cost: <b>${inr(data.real_cost)}</b> of ${inr(data.original_budget)}.`;
  }

  function tableHtml() {
    const { products, dp_table: dp, budget, unit } = data;
    const cur = idx > 0 ? steps[idx - 1] : null;
    const filled = new Set(), path = new Map();
    for (let k = 0; k < idx; k++) {
      const s = steps[k];
      if (s.t === "fill") filled.add(s.i * (budget + 1) + s.w);
      else if (s.t === "back") path.set(s.i * (budget + 1) + s.w, s.took);
    }
    const depA = cur && (cur.t === "fill" || cur.t === "back") ? (cur.i - 1) * (budget + 1) + cur.w : -1;
    let depB = -1;
    if (cur && cur.t === "fill" && products[cur.i - 1].price <= cur.w) depB = (cur.i - 1) * (budget + 1) + cur.w - products[cur.i - 1].price;

    let html = `<table class="dp"><thead><tr><th class="rowh">Product \\ budget</th>`;
    for (let w = 0; w <= budget; w++) html += `<th title="${inr(w * unit)}">${w}</th>`;
    html += `</tr></thead><tbody>`;
    for (let i = 0; i <= products.length; i++) {
      const label = i === 0 ? "0. no products" : `${i}. ${esc(products[i - 1].name)} (c${products[i - 1].price}, v${products[i - 1].value})`;
      html += `<tr><th class="rowh">${label}</th>`;
      for (let w = 0; w <= budget; w++) {
        const key = i * (budget + 1) + w;
        const cls = [];
        const show = i === 0 || filled.has(key);
        if (show) cls.push("filled");
        if (key === depA && cur && cur.t === "fill") cls.push("dep-a");
        if (key === depB && cur && cur.t === "fill") cls.push("dep-b");
        if (cur && cur.t === "fill" && cur.i === i && cur.w === w) cls.push("cur");
        if (path.has(key)) cls.push(path.get(key) ? "took" : "path");
        if (cur && cur.t === "back" && key === depA) cls.push("dep-a");
        html += `<td class="${cls.join(" ")}">${show || path.has(key) ? dp[i][w] : ""}</td>`;
      }
      html += `</tr>`;
    }
    return html + `</tbody></table>`;
  }

  function render() {
    const atStart = idx === 0, atEnd = idx >= steps.length;
    $("#viz", app).innerHTML = `
    <div class="viz-layout">
      <div class="card"><div class="viz-controls">
          <button class="btn secondary small" id="b-prev" ${atStart ? "disabled" : ""}>&laquo; Previous Step</button>
          <button class="btn small" id="b-next" ${atEnd ? "disabled" : ""}>Next Step &raquo;</button>
          <button class="btn secondary small" id="b-row" ${atEnd ? "disabled" : ""}>Next Row</button>
          <button class="btn secondary small" id="b-reset">Reset</button>
          <button class="btn small" id="b-run" ${atEnd && !timer ? "disabled" : ""}>${timer ? "Pause" : "Run All Steps"}</button>
          <span class="muted" style="align-self:center">Step ${idx} / ${steps.length}</span></div>
        <div class="dp-scroll">${tableHtml()}</div></div>
      <div class="card"><h3>What is happening</h3><div class="step-text">${describe(idx > 0 ? steps[idx - 1] : null)}</div>
        <div class="legend"><span style="--c:#6d4aff">Current cell</span><span style="--c:#f0a020">Skip option (cell above)</span>
          <span style="--c:#3b82f6">Buy option (leftover budget)</span><span style="--c:#d9d9e3">Backtrack path</span><span style="--c:#1f9d6b">Product bought</span></div>
        <h3 style="margin-top:1rem">Products (scaled)</h3>
        <div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Name</th><th class="num">Cost</th><th class="num">Score</th></tr></thead><tbody>
        ${data.products.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.name)}</td><td class="num">${p.price}</td><td class="num">${p.value}</td></tr>`).join("")}
        </tbody></table></div></div>
    </div>`;
    $("#b-prev", app).onclick = () => { stop(); idx = Math.max(0, idx - 1); render(); };
    $("#b-next", app).onclick = () => { stop(); idx = Math.min(steps.length, idx + 1); render(); };
    $("#b-row", app).onclick = () => { stop(); nextRow(); render(); };
    $("#b-reset", app).onclick = () => { stop(); idx = 0; render(); };
    $("#b-run", app).onclick = () => {
      if (timer) { stop(); render(); return; }
      timer = setInterval(() => {
        if (idx >= steps.length) { stop(); render(); return; }
        idx++;
        render();
      }, 120);
      render();
    };
    const scroller = $(".dp-scroll", app);
    const curCell = scroller && scroller.querySelector("td.cur, td.took, td.path:last-of-type");
    if (curCell && timer) curCell.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function nextRow() {
    const cur = idx > 0 ? steps[idx - 1] : null;
    if (cur && cur.t !== "fill") { idx = Math.min(steps.length, idx + 1); return; }
    // finish the current row, or start the next one if the current row is already complete
    const target = !cur ? 1 : cur.w < data.budget ? cur.i : cur.i + 1;
    const before = idx;
    while (idx < steps.length && steps[idx].t === "fill" && steps[idx].i <= target) idx++;
    if (idx === before) idx = Math.min(steps.length, idx + 1);  // fill phase over: enter backtracking
  }

  // Build the default table straight away so the page is never empty.
  $("#vf", app).requestSubmit();
  return stop;
}
