// Small helpers shared by every page.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape text before putting it inside innerHTML (prevents HTML injection). */
export function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const inr = (n) => "\u20B9" + Number(n).toLocaleString("en-IN");

export function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = message;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export const loadingHtml = (msg = "Loading...") => `<div class="state"><div class="spinner"></div><p>${esc(msg)}</p></div>`;

export const emptyHtml = (title, text, href, label) => `
  <div class="state card"><h3>${esc(title)}</h3><p>${esc(text)}</p>
  ${href ? `<a class="btn" href="${esc(href)}">${esc(label)}</a>` : ""}</div>`;

export const errorHtml = (msg) => `
  <div class="state error card"><h3>Something went wrong</h3><p>${esc(msg)}</p>
  <button class="btn" data-retry>Try again</button></div>`;

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const fmtDate = (iso) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
