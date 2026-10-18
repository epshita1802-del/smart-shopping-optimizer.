import { api } from "../api.js";
import { $, $$, esc, inr, toast, emptyHtml } from "../utils.js";

export async function optimizer(app, _p, isCurrent) {
  const products = await api.listProducts();
  if (!isCurrent()) return;
  if (!products.length) {
    app.innerHTML = `<div class="page-head"><h1>Budget Optimizer</h1></div>` +
      emptyHtml("No products yet", "Add some products first, then come back to optimize.", "#/product/new", "Add product");
    return;
  }
  let lastBudget = 10000;
  try { lastBudget = Number(localStorage.getItem("lastBudget")) || 10000; } catch { /* storage blocked */ }

  app.innerHTML = `
  <div class="page-head"><div><h1>Budget Optimizer</h1><p>Enter your budget. The 0/1 Knapsack DP finds the highest-value combination that fits.</p></div></div>
  <form class="card form-narrow" id="of" novalidate style="max-width:720px">
    <div class="field"><label for="budget">Shopping budget (whole rupees)</label>
      <input id="budget" type="number" min="0" step="1" value="${lastBudget}"><div class="err" id="budget-err"></div>
      <div class="chips">${[5000, 10000, 15000, 20000, 30000].map((b) => `<button type="button" class="chip" data-b="${b}">${inr(b)}</button>`).join("")}</div></div>
    <div class="field"><label>Products to consider (${products.length} available)</label>
      <div class="chips"><button type="button" class="chip" id="all">Select all</button><button type="button" class="chip" id="none">Select none</button></div>
      <div class="checklist">${products.map((p) => `<label><input type="checkbox" value="${p.id}" checked> ${esc(p.name)} <span class="muted">${inr(p.price)} &middot; ${p.value}</span></label>`).join("")}</div>
      <div class="err" id="prod-err"></div></div>
    <button class="btn big" type="submit" id="go">Optimize My Shopping</button>
  </form>`;

  const budgetEl = $("#budget", app);
  $$(".chip[data-b]", app).forEach((c) => c.addEventListener("click", () => { budgetEl.value = c.dataset.b; }));
  $("#all", app).addEventListener("click", () => $$(".checklist input", app).forEach((i) => { i.checked = true; }));
  $("#none", app).addEventListener("click", () => $$(".checklist input", app).forEach((i) => { i.checked = false; }));

  $("#of", app).addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = budgetEl.value.trim();
    const ids = $$(".checklist input:checked", app).map((i) => Number(i.value));
    $("#budget-err", app).textContent = /^\d+$/.test(raw) ? "" : "Enter a whole number of rupees, 0 or more (no negatives or decimals).";
    $("#prod-err", app).textContent = ids.length ? "" : "Select at least one product.";
    if (!/^\d+$/.test(raw) || !ids.length) return;

    const btn = $("#go", app);
    btn.disabled = true;
    btn.textContent = "Optimizing...";
    try {
      const result = await api.optimize(Number(raw), ids);
      try { localStorage.setItem("lastBudget", raw); } catch { /* ignore */ }
      location.hash = `#/results/${result.id}`;
    } catch (err) {
      toast(err.message, "error");
      btn.disabled = false;
      btn.textContent = "Optimize My Shopping";
    }
  });
}
