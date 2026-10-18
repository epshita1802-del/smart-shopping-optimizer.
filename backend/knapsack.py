"""
0/1 Knapsack using Dynamic Programming (bottom-up tabulation).

Shopping mapping:
    weight   -> product price (integer, whole rupees)
    value    -> product priority score (integer)
    capacity -> user's budget (integer)

Recurrence (i = products considered, w = budget available):
    dp[i][w] = dp[i-1][w]                                      if price[i] > w
    dp[i][w] = max(dp[i-1][w], value[i] + dp[i-1][w-price[i]])  otherwise

Time complexity : O(n * B)   (n products, B integer budget)
Space complexity: O(n * B)   (the full table is kept for backtracking/visualization)

This module has no Flask or database code on purpose, so it is easy to test
and to explain in a viva.
"""


def _validate(products, budget):
    """Raise a clear error on bad input instead of returning garbage."""
    if not isinstance(products, list):
        raise TypeError("products must be a list")
    if isinstance(budget, bool) or not isinstance(budget, int) or budget < 0:
        raise ValueError("budget must be a non-negative integer")
    for idx, p in enumerate(products):
        for key in ("price", "value"):
            v = p.get(key)
            if isinstance(v, bool) or not isinstance(v, int) or v < 0:
                raise ValueError(f"product at index {idx} has an invalid {key}")


def knapsack(products, budget):
    """Return the best set of products for the budget, plus the DP table."""
    _validate(products, budget)
    n = len(products)

    # dp[i][w] = best total value using only the first i products with budget w.
    dp = [[0] * (budget + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        price = products[i - 1]["price"]
        value = products[i - 1]["value"]
        for w in range(budget + 1):
            # Choice 1: exclude product i.
            dp[i][w] = dp[i - 1][w]
            # Choice 2: include it if it fits. We read row i-1 (the PREVIOUS row),
            # so each product can be chosen at most once.
            if price <= w:
                dp[i][w] = max(dp[i][w], value + dp[i - 1][w - price])

    # Backtracking: if the value changed versus the row above, product i was taken.
    chosen = set()
    backtrack_steps = []
    w = budget
    for i in range(n, 0, -1):
        took = dp[i][w] != dp[i - 1][w]
        backtrack_steps.append({"i": i, "w": w, "took": took})
        if took:
            chosen.add(i - 1)
            w -= products[i - 1]["price"]

    selected = [p for idx, p in enumerate(products) if idx in chosen]
    not_selected = [p for idx, p in enumerate(products) if idx not in chosen]
    total_cost = sum(p["price"] for p in selected)

    return {
        "selected": selected,
        "not_selected": not_selected,
        "selected_indices": sorted(chosen),
        "total_cost": total_cost,
        "total_value": dp[n][budget],
        "remaining_budget": budget - total_cost,
        "dp_table": dp,
        "backtrack_steps": backtrack_steps,
    }


def _greedy(products, budget, sort_key):
    """Buy products in the order given by sort_key while they still fit."""
    _validate(products, budget)
    selected, spent = [], 0
    for p in sorted(products, key=sort_key):
        if spent + p["price"] <= budget:
            selected.append(p)
            spent += p["price"]
    return {
        "selected": selected,
        "total_cost": spent,
        "total_value": sum(p["value"] for p in selected),
        "remaining_budget": budget - spent,
    }


# ---- Baselines used ONLY for comparison. They are not optimal. ----

def input_order_baseline(products, budget):
    """Buy in the order the products were listed (stable sort, key is constant)."""
    return _greedy(products, budget, lambda p: 0)


def highest_value_first_baseline(products, budget):
    """Buy the highest priority score first."""
    return _greedy(products, budget, lambda p: -p["value"])


def best_ratio_first_baseline(products, budget):
    """Buy the best priority-per-rupee first (classic greedy heuristic)."""
    return _greedy(
        products, budget,
        lambda p: -(p["value"] / p["price"]) if p["price"] > 0 else float("-inf"),
    )
