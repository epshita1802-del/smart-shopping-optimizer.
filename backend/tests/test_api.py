import itertools
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_PATH"] = os.path.join(_tmp, "test.db")

from app import create_app  # noqa: E402


def brute_force(products, budget):
    best = 0
    for r in range(len(products) + 1):
        for combo in itertools.combinations(products, r):
            if sum(p["price"] for p in combo) <= budget:
                best = max(best, sum(p["value"] for p in combo))
    return best


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = create_app().test_client()

    def test_01_seed_products_listed(self):
        r = self.client.get("/api/products")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.get_json()), 10)

    def test_02_filters(self):
        r = self.client.get("/api/products?category=books").get_json()
        self.assertEqual({p["category"] for p in r}, {"Books"})
        r = self.client.get("/api/products?q=mouse").get_json()
        self.assertEqual(len(r), 1)
        r = self.client.get("/api/products?min_price=3000&max_price=4000").get_json()
        self.assertTrue(all(3000 <= p["price"] <= 4000 for p in r))
        self.assertEqual(self.client.get("/api/products?min_price=abc").status_code, 400)

    def test_03_create_validation(self):
        bad = [
            {"name": "", "category": "x", "price": 10, "value": 5},
            {"name": "x", "category": "x", "price": -10, "value": 5},
            {"name": "x", "category": "x", "price": 10.5, "value": 5},
            {"name": "x", "category": "x", "price": "10", "value": 5},
            {"name": "x", "category": "x", "price": 10, "value": 11},
            {"name": "x", "category": "x", "price": 10, "value": 5, "image_url": "javascript:alert(1)"},
        ]
        for payload in bad:
            self.assertEqual(self.client.post("/api/products", json=payload).status_code, 400, payload)
        self.assertEqual(self.client.post("/api/products", data="nope").status_code, 400)

    def test_04_crud(self):
        r = self.client.post("/api/products", json={"name": " Pen ", "category": "Stationery", "price": 50, "value": 2})
        self.assertEqual(r.status_code, 201)
        pid = r.get_json()["id"]
        self.assertEqual(r.get_json()["name"], "Pen")
        r = self.client.put(f"/api/products/{pid}", json={"name": "Pen+", "category": "Stationery", "price": 60, "value": 3})
        self.assertEqual(r.get_json()["price"], 60)
        self.assertEqual(self.client.delete(f"/api/products/{pid}").status_code, 200)
        self.assertEqual(self.client.get(f"/api/products/{pid}").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/products/{pid}").status_code, 404)

    def test_05_optimize_is_optimal_and_saved(self):
        products = self.client.get("/api/products").get_json()
        for budget in (0, 400, 5000, 10000, 16000):
            r = self.client.post("/api/optimize", json={"budget": budget})
            self.assertEqual(r.status_code, 200)
            res = r.get_json()
            self.assertLessEqual(res["total_cost"], budget)
            self.assertEqual(res["total_value"], brute_force(products, budget))
            self.assertEqual(res["total_cost"] + res["remaining_budget"], budget)
            dp_value = res["strategies"][0]["total_value"]
            for s in res["strategies"][1:]:
                self.assertLessEqual(s["total_value"], dp_value)
                self.assertFalse(s["guaranteed_optimal"])
            saved = self.client.get(f"/api/history/{res['id']}").get_json()
            self.assertEqual(saved["total_value"], res["total_value"])
        self.assertGreaterEqual(len(self.client.get("/api/history").get_json()), 5)

    def test_06_optimize_validation(self):
        for payload in ({}, {"budget": -5}, {"budget": 10.5}, {"budget": "100"}, {"budget": True},
                        {"budget": 10**9}, {"budget": 100, "product_ids": []},
                        {"budget": 100, "product_ids": ["a"]}):
            self.assertEqual(self.client.post("/api/optimize", json=payload).status_code, 400, payload)
        self.assertEqual(self.client.post("/api/optimize", json={"budget": 100, "product_ids": [99999]}).status_code, 404)

    def test_07_optimize_subset(self):
        ids = [p["id"] for p in self.client.get("/api/products").get_json()][:3]
        res = self.client.post("/api/optimize", json={"budget": 100000, "product_ids": ids}).get_json()
        self.assertEqual(sorted(p["id"] for p in res["selected"]), sorted(ids))

    def test_08_visualize(self):
        ids = [p["id"] for p in self.client.get("/api/products").get_json()][:4]
        r = self.client.post("/api/visualize", json={"budget": 6000, "unit": 500, "product_ids": ids})
        self.assertEqual(r.status_code, 200)
        v = r.get_json()
        self.assertEqual(len(v["dp_table"]), 5)
        self.assertEqual(len(v["dp_table"][0]), 13)
        self.assertLessEqual(v["real_cost"], 6000)
        self.assertEqual(len(v["backtrack_steps"]), 4)
        self.assertEqual(self.client.post("/api/visualize", json={"budget": 10**6, "unit": 1, "product_ids": ids}).status_code, 400)

    def test_09_history_delete_and_frontend(self):
        hid = self.client.get("/api/history").get_json()[0]["id"]
        self.assertEqual(self.client.delete(f"/api/history/{hid}").status_code, 200)
        self.assertEqual(self.client.get(f"/api/history/{hid}").status_code, 404)
        self.assertEqual(self.client.get("/api/nope").status_code, 404)

    def test_10_empty_catalog_gives_clear_error(self):
        for p in self.client.get("/api/products").get_json():
            self.client.delete(f"/api/products/{p['id']}")
        r = self.client.post("/api/optimize", json={"budget": 1000})
        self.assertEqual(r.status_code, 400)
        self.assertIn("no products", r.get_json()["error"].lower())


if __name__ == "__main__":
    unittest.main()
