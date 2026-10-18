# Smart Shopping Budget Optimizer (DAA Project)

A web app that picks the best combination of products for a fixed budget using the
**0/1 Knapsack algorithm with Dynamic Programming**.

| Part | Technology |
|------|-----------|
| Frontend | HTML, CSS, JavaScript (no framework) |
| Backend / API | Python 3 + Flask |
| DAA algorithm | Python (`backend/knapsack.py`) |
| Database | SQLite (a file, created automatically, no install needed) |
| Charts | Chart.js (loaded from a CDN, needs internet only for charts) |

## Features
- Dashboard: budget, cost, remaining budget, value score, products selected, utilization, charts
- Product catalog: add, edit, delete, search by name, filter by category and price range
- Optimizer: budget validation, recommended products, not-selected products, explanation, strategy comparison
- DP visualizer: step through every table cell, include/exclude decisions, backtracking (Next, Previous, Next Row, Reset, Run All)
- Analytics: budget utilization, selected vs unselected, category spending, strategy comparison (all from real data)
- History: every optimization is saved in SQLite and can be reopened or deleted
- Loading, empty, error and success states everywhere

## Folder structure
```
backend/
  app.py              Flask routes, validation, serves the frontend
  knapsack.py         the DAA algorithm (no Flask/DB code inside)
  database.py         SQLite access
  sample_products.py  10 sample products (first run only)
  tests/              test_knapsack.py (algorithm), test_api.py (REST API)
frontend/
  index.html, css/style.css
  js/                 api.js, main.js (router), charts.js, results.js, utils.js, pages/*.js
docs/DAA_NOTES.md     report and viva notes
```

## Setup and run

Requires Python 3.9+.

**Windows (PowerShell)**
```powershell
cd smart-shopping-optimizer
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd backend
python app.py
```

**macOS / Linux**
```bash
cd smart-shopping-optimizer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd backend
python3 app.py
```

Open **http://127.0.0.1:5000** in the browser. Always open it through this address (not by double-clicking `index.html`),
because Flask serves the frontend and the API on the same port.

Optional: copy `.env.example` to `backend/.env` to change the port or database file. No secrets are needed.

## Run the tests
```bash
cd backend
python -m unittest discover -s tests -v
```
Covers: budget below every price, budget equal to one price, equal prices, exact budget use, products over budget,
empty list, zero budget, fewer items giving more value, no product chosen twice, invalid input, API validation and CRUD,
and a randomised check of 300 cases against brute force (the DP result is always the true maximum and never over budget).

## The algorithm
`dp[i][w]` = best total priority score using the first `i` products with budget `w`.
```
dp[i][w] = dp[i-1][w]                                         if price[i] > w
dp[i][w] = max(dp[i-1][w], value[i] + dp[i-1][w - price[i]])   otherwise
```
The "include" option reads the **previous row**, so each product is used at most once.
Backtracking from `dp[n][B]` recovers the chosen products.

- **Time:** O(n x B)  **Space:** O(n x B)  (n = products, B = integer budget)
- Prices and budgets are whole rupees (integers) to avoid floating-point errors.
- The comparison strategies (input order, highest priority first, best priority per rupee) are labelled baselines. Only the DP result is guaranteed optimal.
- The visualizer scales prices (prices rounded up, budget rounded down) so the table stays small; the main optimizer always uses exact prices.
- Safety limits: budget up to 1,000,000 and (products+1) x (budget+1) up to 5,000,000 cells.

## API documentation
All bodies are JSON. Errors look like `{"error": "message", "details": [...]}`.

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/products?q=&category=&min_price=&max_price=` | List products (all filters optional) |
| GET | `/api/categories` | List distinct categories |
| GET | `/api/products/<id>` | One product (404 if missing) |
| POST | `/api/products` | Create: `{name, category, price, value, image_url?}` returns 201 |
| PUT | `/api/products/<id>` | Update (same body) |
| DELETE | `/api/products/<id>` | Delete |
| POST | `/api/optimize` | `{budget, product_ids?}` runs the DP, saves to history, returns the result |
| POST | `/api/visualize` | `{budget, unit, product_ids}` returns the scaled DP table and backtracking steps |
| GET | `/api/history` | Recent runs (summary) |
| GET | `/api/history/<id>` | Full saved result |
| DELETE | `/api/history/<id>` | Delete a run |
| GET | `/api/health` | `{"status": "ok"}` |

Validation: `price` is a whole number >= 1, `value` is a whole number 1 to 10, `budget` is a whole number >= 0 (no decimals, strings or negatives),
`image_url` must be empty or start with `http://` or `https://`.

Example:
```bash
curl -X POST http://127.0.0.1:5000/api/optimize -H "Content-Type: application/json" -d '{"budget": 10000}'
```

## Screenshots
Add your screenshots here after running the project (dashboard, catalog, results, visualizer).
