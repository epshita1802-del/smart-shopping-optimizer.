import { api } from "../api.js";
import { emptyHtml, fmtDate } from "../utils.js";
import { summaryCardsHtml, chartsHtml, drawCharts } from "../results.js";

export async function dashboard(app, _p, isCurrent) {
  const history = await api.history();
  if (!isCurrent()) return;
  if (!history.length) {
    app.innerHTML = `<div class="page-head"><div><h1>Shopping Dashboard</h1></div></div>` +
      emptyHtml("No optimization yet", "Run the optimizer once and your latest results and charts will appear here.", "#/optimize", "Optimize my shopping");
    return;
  }
  const r = await api.historyItem(history[0].id);
  if (!isCurrent()) return;
  app.innerHTML = `
    <div class="page-head"><div><h1>Shopping Dashboard</h1><p>Latest run: ${fmtDate(r.created_at)}</p></div>
      <div><a class="btn" href="#/optimize">New optimization</a> <a class="btn secondary" href="#/results/${r.id}">Full results</a></div></div>
    ${summaryCardsHtml(r)}${chartsHtml(false)}`;
  drawCharts(r, false);
}
