// Tiny hash router: each route maps to a page function that renders into #app.
import { $, loadingHtml, errorHtml } from "./utils.js";
import { destroyCharts } from "./charts.js";
import { home } from "./pages/home.js";
import { dashboard } from "./pages/dashboard.js";
import { catalog } from "./pages/catalog.js";
import { productForm } from "./pages/productForm.js";
import { optimizer } from "./pages/optimizer.js";
import { results } from "./pages/results.js";
import { visualizer } from "./pages/visualizer.js";
import { history } from "./pages/history.js";
import { about } from "./pages/about.js";

const routes = [
  [/^#\/?$/, home, "home"],
  [/^#\/dashboard$/, dashboard, "dashboard"],
  [/^#\/catalog$/, catalog, "catalog"],
  [/^#\/product\/new$/, productForm, "catalog"],
  [/^#\/product\/(\d+)\/edit$/, productForm, "catalog"],
  [/^#\/optimize$/, optimizer, "optimize"],
  [/^#\/results\/(\d+)$/, results, "optimize"],
  [/^#\/visualize$/, visualizer, "visualize"],
  [/^#\/history$/, history, "history"],
  [/^#\/about$/, about, "about"],
];

const TITLES = { home: "Home", dashboard: "Dashboard", catalog: "Products", optimize: "Optimizer", visualize: "DP Visualizer", history: "History", about: "About" };
const app = $("#app");
let cleanup = null;
let token = 0;

async function render() {
  if (cleanup) { cleanup(); cleanup = null; }
  destroyCharts();
  $("#nav").classList.remove("open");
  const my = ++token;
  const isCurrent = () => my === token;   // pages check this after every await
  const hash = location.hash || "#/";

  for (const [re, page, navKey] of routes) {
    const m = hash.match(re);
    if (!m) continue;
    document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === navKey));
    document.title = (TITLES[navKey] || "Smart Shopping") + " | Smart Shopping Budget Optimizer";
    app.innerHTML = loadingHtml();
    try {
      const c = await page(app, m.slice(1), isCurrent);
      if (isCurrent()) cleanup = c || null; else if (c) c();
    } catch (e) {
      if (!isCurrent()) return;
      app.innerHTML = errorHtml(e.message);
      const retry = app.querySelector("[data-retry]");
      if (retry) retry.addEventListener("click", render);
    }
    window.scrollTo(0, 0);
    return;
  }
  app.innerHTML = `<div class="state card"><h3>Page not found</h3><a class="btn" href="#/">Go home</a></div>`;
}

$("#menu-btn").addEventListener("click", () => $("#nav").classList.toggle("open"));
window.addEventListener("hashchange", render);
render();
