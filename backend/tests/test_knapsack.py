import itertools
import os
import random
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from knapsack import knapsack, input_order_baseline
from sample_products import SAMPLE_PRODUCTS


def P(name, price, value):
    return {"name": name, "price": price, "value": value}


def brute_force_best(products, budget):
    """Try all 2^n subsets - proves the DP answer is the true maximum."""
    best = 0
    for r in range(len(products) + 1):
        for combo in itertools.combinations(products, r):
            if sum(p["price"] for p in combo) <= budget:
                best = max(best, sum(p["value"] for p in combo))
    return best


class KnapsackTests(unittest.TestCase):
    def test_budget_smaller_than_every_price(self):
        r = knapsack([P("a", 50, 5), P("b", 80, 9)], 10)
        self.assertEqual(r["selected"], [])
        self.assertEqual(r["total_value"], 0)
        self.assertEqual(r["remaining_budget"], 10)

    def test_budget_equals_one_price(self):
        r = knapsack([P("a", 100, 5), P("b", 150, 9)], 100)
        self.assertEqual([p["name"] for p in r["selected"]], ["a"])
        self.assertEqual(r["remaining_budget"], 0)

    def test_same_prices(self):
        r = knapsack([P("a", 100, 3), P("b", 100, 8), P("c", 100, 5)], 200)
        self.assertEqual(r["total_value"], 13)
        self.assertEqual(sorted(p["name"] for p in r["selected"]), ["b", "c"])

    def test_exactly_exhausts_budget(self):
        r = knapsack([P("a", 40, 4), P("b", 60, 6), P("c", 70, 1)], 100)
        self.assertEqual(r["total_cost"], 100)
        self.assertEqual(r["remaining_budget"], 0)
        self.assertEqual(r["total_value"], 10)

    def test_product_over_budget_never_selected(self):
        r = knapsack([P("big", 1000, 100), P("small", 20, 1)], 50)
        self.assertEqual([p["name"] for p in r["selected"]], ["small"])

    def test_empty_list(self):
        r = knapsack([], 500)
        self.assertEqual(r["total_value"], 0)
        self.assertEqual(r["selected"], [])
        self.assertEqual(r["remaining_budget"], 500)

    def test_zero_budget(self):
        r = knapsack([P("a", 10, 5)], 0)
        self.assertEqual(r["total_value"], 0)
        self.assertEqual(r["selected"], [])

    def test_fewer_products_can_be_better(self):
        r = knapsack([P("c1", 50, 3), P("c2", 50, 3), P("premium", 100, 20)], 100)
        self.assertEqual([p["name"] for p in r["selected"]], ["premium"])
        self.assertEqual(r["total_value"], 20)

    def test_never_selected_twice(self):
        r = knapsack([P("a", 10, 10)], 100)
        self.assertEqual(len(r["selected"]), 1)
        self.assertEqual(r["total_value"], 10)

    def test_dp_beats_baseline(self):
        items = [P("a", 60, 60), P("b", 50, 50), P("c", 50, 50)]
        dp = knapsack(items, 100)
        base = input_order_baseline(items, 100)
        self.assertEqual(dp["total_value"], 100)
        self.assertEqual(base["total_value"], 60)

    def test_invalid_input(self):
        with self.assertRaises(ValueError):
            knapsack([P("a", -5, 1)], 10)
        with self.assertRaises(ValueError):
            knapsack([P("a", 1.5, 1)], 10)
        with self.assertRaises(ValueError):
            knapsack([P("a", 5, 1)], -1)
        with self.assertRaises(TypeError):
            knapsack("nope", 10)

    def test_randomised_matches_brute_force(self):
        rng = random.Random(12345)  # fixed seed so failures are reproducible
        for _ in range(300):
            items = [P(f"p{i}", rng.randint(0, 59), rng.randint(0, 19))
                     for i in range(rng.randint(0, 9))]
            budget = rng.randint(0, 149)
            r = knapsack(items, budget)
            self.assertLessEqual(r["total_cost"], budget)
            self.assertEqual(r["total_cost"] + r["remaining_budget"], budget)
            self.assertEqual(sum(p["value"] for p in r["selected"]), r["total_value"])
            self.assertEqual(r["total_value"], brute_force_best(items, budget))

    def test_sample_dataset(self):
        r = knapsack(SAMPLE_PRODUCTS, 10000)
        self.assertLessEqual(r["total_cost"], 10000)
        self.assertEqual(r["total_value"], brute_force_best(SAMPLE_PRODUCTS, 10000))


if __name__ == "__main__":
    unittest.main()
