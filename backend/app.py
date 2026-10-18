"""Flask REST API + static frontend server for the Smart Shopping Budget Optimizer."""
import os
import re

from flask import Flask, jsonify, request, send_from_directory

try:  # optional: load backend/.env if python-dotenv is installed
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import database as db
from knapsack import (
    best_ratio_first_baseline,
    highest_value_first_baseline,
    input_order_baseline,
    knapsack,
)

MAX_BUDGET = 1_000_000          # rupees
MAX_CELLS = 5_000_000           # (n+1) * (budget+1) safety limit for the DP table
MAX_VIZ_PRODUCTS = 8
MAX_VIZ_BUDGET_UNITS = 60
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")


class ApiError(Exception):
    def __init__(self, message, status=400, details=None):
        super().__init__(message)
        self.message, self.status, self.details = message, status, details


def is_int(v):
    """True only for real integers (bool is excluded, 10.5 and '10' are rejected)."""
    return isinstance(v, int) and not isinstance(v, bool)


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be a JSON object")
    return data


def clean_product(data):
    """Validate and normalise a product payload."""
    errors = []
    name = data.get("name")
    category = data.get("category")
    price, value = data.get("price"), data.get("value")
    image = data.get("image_url") or ""

    name = name.strip() if isinstance(name, str) else ""
    category = category.strip() if isinstance(category, str) else ""
    image = image.strip() if isinstance(image, str) else None

    if not name or len(name) > 80:
        errors.append("name is required (max 80 characters)")
    if not category or len(category) > 40:
        errors.append("category is required (max 40 characters)")
    if not is_int(price) or not 1 <= price <= 10_000_000:
        errors.append("price must be a whole number of rupees, at least 1")
    if not is_int(value) or not 1 <= value <= 10:
        errors.append("value (priority) must be a whole number from 1 to 10")
    if image is None or len(image) > 500 or (image and not re.match(r"^https?://", image, re.I)):
        errors.append("image_url must be empty or start with http:// or https://")
    if errors:
        raise ApiError("Validation failed", 400, errors)
    return {"name": name, "category": category, "price": price, "value": value, "image_url": image}


def parse_int_param(name):
    raw = request.args.get(name)
    if raw in (None, ""):
        return None
    try:
        v = int(raw)
    except ValueError:
        raise ApiError(f"{name} must be a whole number")
    if v < 0:
        raise ApiError(f"{name} cannot be negative")
    return v


def validate_budget(budget):
    if not is_int(budget) or budget < 0:
        raise ApiError("budget must be a whole number of rupees (0 or more)")
    if budget > MAX_BUDGET:
        raise ApiError(f"budget cannot exceed {MAX_BUDGET:,}")


def pick_products(ids):
    """Return catalog products, optionally limited to the given ids."""
    all_products = db.list_products()
    if ids is None:
        return all_products
    if not isinstance(ids, list) or not ids or not all(is_int(i) for i in ids):
        raise ApiError("product_ids must be a non-empty list of product ids")
    by_id = {p["id"]: p for p in all_products}
    missing = [i for i in ids if i not in by_id]
    if missing:
        raise ApiError(f"Unknown product id(s): {missing}", 404)
    return [by_id[i] for i in dict.fromkeys(ids)]  # keep order, drop duplicates


def summarize(key, name, res, optimal, note):
    return {
        "key": key, "name": name, "count": len(res["selected"]),
        "total_cost": res["total_cost"], "total_value": res["total_value"],
        "remaining_budget": res["remaining_budget"],
        "guaranteed_optimal": optimal, "note": note,
    }


def build_explanation(result, baseline):
    n_total = len(result["selected"]) + len(result["not_selected"])
    parts = [
        f"The 0/1 Knapsack DP checked every possible combination of the {n_total} products "
        f"(without trying them one by one) and found the maximum total priority score "
        f"{result['total_value']} that fits in the budget of ₹{result['budget']:,}.",
        f"It selected {len(result['selected'])} product(s) costing ₹{result['total_cost']:,}, "
        f"leaving ₹{result['remaining_budget']:,} unspent.",
    ]
    if result["remaining_budget"] > 0 and result["not_selected"]:
        parts.append("No unselected product with a positive score fits in the leftover money, "
                     "otherwise the DP would have added it.")
    diff = result["total_value"] - baseline["total_value"]
    if diff > 0:
        parts.append(f"Buying in input order would only reach a score of {baseline['total_value']}, "
                     f"so the DP result is {diff} point(s) better.")
    else:
        parts.append(f"Buying in input order happens to reach the same score ({baseline['total_value']}) on "
                     "this data. The DP result is never worse, and often better on other data.")
    return " ".join(parts)


def build_result(products, budget):
    """Run the DP and wrap the answer with baselines, analytics and an explanation."""
    dp = knapsack(products, budget)
    base_input = input_order_baseline(products, budget)
    base_value = highest_value_first_baseline(products, budget)
    base_ratio = best_ratio_first_baseline(products, budget)

    category_spending = {}
    for p in dp["selected"]:
        category_spending[p["category"]] = category_spending.get(p["category"], 0) + p["price"]

    result = {
        "budget": budget,
        "selected": dp["selected"],
        "not_selected": dp["not_selected"],
        "total_cost": dp["total_cost"],
        "total_value": dp["total_value"],
        "remaining_budget": dp["remaining_budget"],
        "utilization_pct": round(dp["total_cost"] / budget * 100, 1) if budget else 0,
        "category_spending": category_spending,
        "strategies": [
            summarize("dp", "Dynamic Programming (0/1 Knapsack)", dp, True,
                      "Maximizes total value within the budget."),
            summarize("input_order", "Buy in input order", base_input, False,
                      "Baseline only. Not necessarily optimal."),
            summarize("highest_value", "Highest priority first", base_value, False,
                      "Baseline only. Not necessarily optimal."),
            summarize("best_ratio", "Best priority per rupee first", base_ratio, False,
                      "Baseline only. Not necessarily optimal."),
        ],
    }
    result["explanation"] = build_explanation(result, base_input)
    return result


def create_app():
    app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
    db.init_db()

    # ---------- errors ----------
    @app.errorhandler(ApiError)
    def handle_api_error(e):
        body = {"error": e.message}
        if e.details:
            body["details"] = e.details
        return jsonify(body), e.status

    @app.errorhandler(404)
    def handle_404(_):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(405)
    def handle_405(_):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        app.logger.exception(e)
        return jsonify({"error": "Internal server error"}), 500

    # ---------- frontend ----------
    @app.get("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    # ---------- products ----------
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    @app.get("/api/products")
    def get_products():
        return jsonify(db.list_products(
            q=(request.args.get("q") or "").strip() or None,
            category=(request.args.get("category") or "").strip() or None,
            min_price=parse_int_param("min_price"),
            max_price=parse_int_param("max_price"),
        ))

    @app.get("/api/categories")
    def get_categories():
        return jsonify(db.list_categories())

    @app.get("/api/products/<int:pid>")
    def get_one_product(pid):
        p = db.get_product(pid)
        if not p:
            raise ApiError("Product not found", 404)
        return jsonify(p)

    @app.post("/api/products")
    def add_product():
        return jsonify(db.create_product(clean_product(json_body()))), 201

    @app.put("/api/products/<int:pid>")
    def edit_product(pid):
        p = db.update_product(pid, clean_product(json_body()))
        if not p:
            raise ApiError("Product not found", 404)
        return jsonify(p)

    @app.delete("/api/products/<int:pid>")
    def remove_product(pid):
        if not db.delete_product(pid):
            raise ApiError("Product not found", 404)
        return jsonify({"deleted": pid})

    # ---------- optimization ----------
    @app.post("/api/optimize")
    def optimize():
        body = json_body()
        budget = body.get("budget")
        validate_budget(budget)
        products = pick_products(body.get("product_ids"))
        if not products:
            raise ApiError("There are no products to optimize. Add some products first.")
        if (len(products) + 1) * (budget + 1) > MAX_CELLS:
            raise ApiError("This budget and product count make the DP table too large. "
                           "Lower the budget or select fewer products.")
        result = build_result(products, budget)
        result["id"], result["created_at"] = db.save_history(result)
        return jsonify(result)

    @app.post("/api/visualize")
    def visualize():
        """Run the DP on a small scaled problem so the whole table fits on screen."""
        body = json_body()
        budget, unit = body.get("budget"), body.get("unit", 1)
        validate_budget(budget)
        if not is_int(unit) or not 1 <= unit <= 100_000:
            raise ApiError("unit must be a whole number from 1 to 100000")
        products = pick_products(body.get("product_ids"))
        if not 1 <= len(products) <= MAX_VIZ_PRODUCTS:
            raise ApiError(f"Select between 1 and {MAX_VIZ_PRODUCTS} products for the visualization")
        scaled_budget = budget // unit
        if scaled_budget > MAX_VIZ_BUDGET_UNITS:
            raise ApiError(f"Budget is {scaled_budget} units wide. Pick a larger unit so it is "
                           f"at most {MAX_VIZ_BUDGET_UNITS}.")
        # Prices are rounded UP and the budget DOWN, so the real cost can never exceed the budget.
        scaled = [{"name": p["name"], "price": -(-p["price"] // unit), "value": p["value"],
                   "original_price": p["price"]} for p in products]
        dp = knapsack(scaled, scaled_budget)
        return jsonify({
            "unit": unit, "original_budget": budget, "budget": scaled_budget, "products": scaled,
            "dp_table": dp["dp_table"], "backtrack_steps": dp["backtrack_steps"],
            "selected_indices": dp["selected_indices"], "total_value": dp["total_value"],
            "real_cost": sum(scaled[i]["original_price"] for i in dp["selected_indices"]),
        })

    # ---------- history ----------
    @app.get("/api/history")
    def history_list():
        return jsonify(db.list_history())

    @app.get("/api/history/<int:hid>")
    def history_one(hid):
        r = db.get_history(hid)
        if not r:
            raise ApiError("History entry not found", 404)
        return jsonify(r)

    @app.delete("/api/history/<int:hid>")
    def history_delete(hid):
        if not db.delete_history(hid):
            raise ApiError("History entry not found", 404)
        return jsonify({"deleted": hid})

    return app


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    create_app().run(host="127.0.0.1", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
