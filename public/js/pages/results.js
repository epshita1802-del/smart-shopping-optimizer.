import { api } from "../api.js";
import { fmtDate } from "../utils.js";
import { resultBodyHtml, drawCharts } from "../results.js";

export async function results(app, params, isCurrent) {
  const r = await api.historyItem(params[0]);
  if (!isCurrent()) return;
  app.innerHTML = `
    <div class="page-head"><div><h1>Optimization results</h1><p>Run #${r.id} &middot; ${fmtDate(r.created_at)}</p></div>
      <div><a class="btn" href="#/optimize">Optimize again</a> <a class="btn secondary" href="#/visualize">DP visualizer</a>
      <a class="btn secondary" href="#/history">History</a></div></div>
    ${resultBodyHtml(r)}`;
  drawCharts(r, true);
}
