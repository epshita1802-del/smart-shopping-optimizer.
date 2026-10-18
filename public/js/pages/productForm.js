import { api } from "../api.js";
import { $, esc, toast } from "../utils.js";

export async function productForm(app, params, isCurrent) {
  const id = params[0];
  const [existing, categories] = await Promise.all([id ? api.getProduct(id) : null, api.categories()]);
  if (!isCurrent()) return;
  const p = existing || { name: "", category: "", price: "", value: 5, image_url: "" };

  app.innerHTML = `
  <div class="page-head"><div><h1>${id ? "Edit product" : "Add product"}</h1></div><a class="btn secondary" href="#/catalog">Back</a></div>
  <form class="card form-narrow" id="pf" novalidate>
    <div class="field"><label for="name">Name</label><input id="name" maxlength="80" value="${esc(p.name)}"><div class="err" data-err="name"></div></div>
    <div class="field"><label for="category">Category</label><input id="category" maxlength="40" list="cats" value="${esc(p.category)}">
      <datalist id="cats">${categories.map((c) => `<option value="${esc(c)}">`).join("")}</datalist><div class="err" data-err="category"></div></div>
    <div class="field"><label for="price">Price (whole rupees)</label><input id="price" type="number" min="1" step="1" value="${esc(p.price)}"><div class="err" data-err="price"></div></div>
    <div class="field"><label for="value">Priority score: <output id="val-out">${p.value}</output> / 10</label>
      <input id="value" type="range" min="1" max="10" step="1" value="${p.value}"><div class="err" data-err="value"></div></div>
    <div class="field"><label for="image_url">Image URL (optional)</label><input id="image_url" placeholder="https://..." value="${esc(p.image_url)}"><div class="err" data-err="image_url"></div></div>
    <button class="btn" type="submit" id="save">${id ? "Save changes" : "Add product"}</button>
  </form>`;

  const form = $("#pf", app);
  $("#value", app).addEventListener("input", (e) => { $("#val-out", app).textContent = e.target.value; });

  const showErrors = (errs) => {
    form.querySelectorAll("[data-err]").forEach((el) => { el.textContent = errs[el.dataset.err] || ""; });
    return Object.keys(errs).length === 0;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const priceRaw = $("#price", app).value.trim();
    const data = {
      name: $("#name", app).value.trim(), category: $("#category", app).value.trim(),
      price: /^\d+$/.test(priceRaw) ? Number(priceRaw) : NaN, value: Number($("#value", app).value),
      image_url: $("#image_url", app).value.trim(),
    };
    const errs = {};
    if (!data.name) errs.name = "Name is required.";
    if (!data.category) errs.category = "Category is required.";
    if (!Number.isInteger(data.price) || data.price < 1) errs.price = "Enter a whole number of rupees, at least 1 (no negatives or decimals).";
    if (data.image_url && !/^https?:\/\//i.test(data.image_url)) errs.image_url = "Must start with http:// or https://";
    if (!showErrors(errs)) return;

    const btn = $("#save", app);
    btn.disabled = true;
    try {
      await (id ? api.updateProduct(id, data) : api.createProduct(data));
      toast(id ? "Product updated" : "Product added");
      location.hash = "#/catalog";
    } catch (err) {
      toast(err.details ? err.details.join(" ") : err.message, "error");
      btn.disabled = false;
    }
  });
}
