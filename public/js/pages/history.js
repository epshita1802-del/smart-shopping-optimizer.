import { api } from "../api.js";
import { $, inr, fmtDate, toast, emptyHtml } from "../utils.js";

export async function history(app, _p, isCurrent) {
  async function render() {
    const rows = await api.history();
    if (!isCurrent()) return;
    app.innerHTML = `<div class="page-head"><div><h1>Optimization history</h1><p>Every run is saved in the SQLite database.</p></div>
      <a class="btn" href="#/optimize">New optimization</a></div>` + (rows.length ? `
      <div class="card table-wrap"><table class="data"><thead><tr><th>#</th><th>When</th><th class="num">Budget</th><th class="num">Spent</th>
        <th class="num">Value</th><th class="num">Left</th><th class="num">Products</th><th></th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${r.id}</td><td>${fmtDate(r.created_at)}</td><td class="num">${inr(r.budget)}</td>
        <td class="num">${inr(r.total_cost)}</td><td class="num">${r.total_value}</td><td class="num">${inr(r.remaining_budget)}</td>
        <td class="num">${r.selected_count}</td>
        <td><a class="btn secondary small" href="#/results/${r.id}">View</a> <button class="btn danger small" data-del="${r.id}">Delete</button></td></tr>`).join("")}
      </tbody></table></div>` : emptyHtml("No history yet", "Your optimization runs will be listed here.", "#/optimize", "Optimize my shopping"));
    app.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delete this history entry?")) return;
      try { await api.deleteHistory(b.dataset.del); toast("Entry deleted"); render(); } catch (e) { toast(e.message, "error"); }
    }));
  }
  await render();
}
