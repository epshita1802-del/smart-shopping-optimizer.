import { api } from "../api.js";
import { $, esc, inr, toast, debounce, loadingHtml, emptyHtml, errorHtml } from "../utils.js";

export async function catalog(app, _p, isCurrent) {
  const categories = await api.categories();
  if (!isCurrent()) return;
  app.innerHTML = `
    <div class="page-head"><div><h1>Products</h1><p>Prices are in whole rupees. Priority score: 1 (nice to have) to 10 (must have).</p></div>
      <a class="btn" href="#/product/new">+ Add product</a></div>
    <div class="filters card">
      <div><label for="f-q">Search by name</label><input id="f-q" placeholder="e.g. keyboard"></div>
      <div><label for="f-cat">Category</label><select id="f-cat"><option value="">All</option>
        ${categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select></div>
      <div><label for="f-min">Min price</label><input id="f-min" type="number" min="0" step="1"></div>
      <div><label for="f-max">Max price</label><input id="f-max" type="number" min="0" step="1"></div>
      <button class="btn secondary" id="f-clear">Clear</button>
    </div>
    <div id="grid"></div>`;

  const grid = $("#grid", app);
  async function load() {
    grid.innerHTML = loadingHtml("Loading products...");
    try {
      const list = await api.listProducts({
        q: $("#f-q", app).value.trim(), category: $("#f-cat", app).value,
        min_price: $("#f-min", app).value, max_price: $("#f-max", app).value,
      });
      if (!isCurrent()) return;
      grid.innerHTML = list.length
        ? `<div class="grid product-grid">${list.map(card).join("")}</div>`
        : emptyHtml("No products found", "Try different filters or add a new product.", "#/product/new", "Add product");
      grid.querySelectorAll("img[data-thumb]").forEach((img) => img.addEventListener("error", () => {
        img.parentElement.textContent = img.dataset.initial;
      }));
    } catch (e) {
      grid.innerHTML = errorHtml(e.message);
      $("[data-retry]", grid).addEventListener("click", load);
    }
  }

  const reload = debounce(load, 250);
  ["#f-q", "#f-min", "#f-max"].forEach((s) => $(s, app).addEventListener("input", reload));
  $("#f-cat", app).addEventListener("change", load);
  $("#f-clear", app).addEventListener("click", () => {
    ["#f-q", "#f-cat", "#f-min", "#f-max"].forEach((s) => { $(s, app).value = ""; });
    load();
  });
  grid.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("[data-delete]");
    if (!btn || !confirm("Delete this product?")) return;
    try {
      await api.deleteProduct(btn.dataset.delete);
      toast("Product deleted");
      load();
    } catch (e) { toast(e.message, "error"); }
  });
  await load();
}

function card(p) {
  const initial = esc((p.name[0] || "?").toUpperCase());
  const thumb = p.image_url
    ? `<img data-thumb data-initial="${initial}" src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`
    : initial;
  return `
  <div class="card product">
    <div class="thumb">${thumb}</div>
    <div class="body">
      <h3>${esc(p.name)}</h3>
      <div><span class="badge">${esc(p.category)}</span></div>
      <div class="row"><span class="price">${inr(p.price)}</span>
        <span class="meter" title="Priority ${p.value}/10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < p.value ? "on" : ""}"></i>`).join("")}</span></div>
      <div class="muted" style="font-size:.85rem">Priority score: <b>${p.value}</b> / 10</div>
      <div class="actions"><a class="btn secondary small" href="#/product/${p.id}/edit">Edit</a>
        <button class="btn danger small" data-delete="${p.id}">Delete</button></div>
    </div>
  </div>`;
}
