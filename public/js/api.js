// All communication with the Flask backend lives here (no fetch calls anywhere else).
async function request(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Is the Flask backend running?");
  }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.details = data && data.details;
    throw err;
  }
  return data;
}

export const api = {
  listProducts: (filters = {}) => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== "" && v != null)).toString();
    return request("GET", "/api/products" + (qs ? "?" + qs : ""));
  },
  categories: () => request("GET", "/api/categories"),
  getProduct: (id) => request("GET", `/api/products/${id}`),
  createProduct: (p) => request("POST", "/api/products", p),
  updateProduct: (id, p) => request("PUT", `/api/products/${id}`, p),
  deleteProduct: (id) => request("DELETE", `/api/products/${id}`),
  optimize: (budget, productIds) => request("POST", "/api/optimize", { budget, product_ids: productIds }),
  visualize: (budget, unit, productIds) => request("POST", "/api/visualize", { budget, unit, product_ids: productIds }),
  history: () => request("GET", "/api/history"),
  historyItem: (id) => request("GET", `/api/history/${id}`),
  deleteHistory: (id) => request("DELETE", `/api/history/${id}`),
};
