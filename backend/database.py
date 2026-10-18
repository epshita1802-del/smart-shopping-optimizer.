"""SQLite persistence for products and optimization history."""
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from sample_products import SAMPLE_PRODUCTS


def db_path():
    # Read at call time so tests / .env can change it.
    if os.environ.get("DATABASE_PATH"):
        return os.environ["DATABASE_PATH"]
    # Vercel's disk is read-only except /tmp (data there is temporary).
    if os.environ.get("VERCEL"):
        return "/tmp/shopping.db"
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "shopping.db")


@contextmanager
def connect():
    conn = sqlite3.connect(db_path())
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create tables. Seed sample products only the first time the DB is created."""
    with connect() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price INTEGER NOT NULL CHECK (price > 0),
            value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 10),
            image_url TEXT NOT NULL DEFAULT ''
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            budget INTEGER NOT NULL,
            total_cost INTEGER NOT NULL,
            total_value INTEGER NOT NULL,
            remaining_budget INTEGER NOT NULL,
            selected_count INTEGER NOT NULL,
            result_json TEXT NOT NULL
        )""")
        if c.execute("PRAGMA user_version").fetchone()[0] == 0:
            c.executemany(
                "INSERT INTO products (name, category, price, value, image_url) VALUES (?,?,?,?,'')",
                [(p["name"], p["category"], p["price"], p["value"]) for p in SAMPLE_PRODUCTS],
            )
            c.execute("PRAGMA user_version = 1")


# ---------------- products ----------------

def list_products(q=None, category=None, min_price=None, max_price=None):
    sql, params = "SELECT * FROM products WHERE 1=1", []
    if q:
        escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        sql += " AND name LIKE ? ESCAPE '\\'"
        params.append(f"%{escaped}%")
    if category:
        sql += " AND LOWER(category) = LOWER(?)"
        params.append(category)
    if min_price is not None:
        sql += " AND price >= ?"
        params.append(min_price)
    if max_price is not None:
        sql += " AND price <= ?"
        params.append(max_price)
    with connect() as c:
        return [dict(r) for r in c.execute(sql + " ORDER BY id", params)]


def list_categories():
    with connect() as c:
        return [r[0] for r in c.execute("SELECT DISTINCT category FROM products ORDER BY category COLLATE NOCASE")]


def get_product(pid):
    with connect() as c:
        row = c.execute("SELECT * FROM products WHERE id = ?", (pid,)).fetchone()
        return dict(row) if row else None


def create_product(d):
    with connect() as c:
        cur = c.execute(
            "INSERT INTO products (name, category, price, value, image_url) VALUES (?,?,?,?,?)",
            (d["name"], d["category"], d["price"], d["value"], d["image_url"]),
        )
        pid = cur.lastrowid
    return get_product(pid)


def update_product(pid, d):
    with connect() as c:
        cur = c.execute(
            "UPDATE products SET name=?, category=?, price=?, value=?, image_url=? WHERE id=?",
            (d["name"], d["category"], d["price"], d["value"], d["image_url"], pid),
        )
        if cur.rowcount == 0:
            return None
    return get_product(pid)


def delete_product(pid):
    with connect() as c:
        return c.execute("DELETE FROM products WHERE id = ?", (pid,)).rowcount > 0


# ---------------- history ----------------

def save_history(result):
    created = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with connect() as c:
        cur = c.execute(
            """INSERT INTO history (created_at, budget, total_cost, total_value,
               remaining_budget, selected_count, result_json) VALUES (?,?,?,?,?,?,?)""",
            (created, result["budget"], result["total_cost"], result["total_value"],
             result["remaining_budget"], len(result["selected"]), json.dumps(result)),
        )
        return cur.lastrowid, created


def list_history():
    with connect() as c:
        rows = c.execute(
            """SELECT id, created_at, budget, total_cost, total_value, remaining_budget, selected_count
               FROM history ORDER BY id DESC LIMIT 100"""
        )
        return [dict(r) for r in rows]


def get_history(hid):
    with connect() as c:
        row = c.execute("SELECT * FROM history WHERE id = ?", (hid,)).fetchone()
    if not row:
        return None
    result = json.loads(row["result_json"])
    result["id"], result["created_at"] = row["id"], row["created_at"]
    return result


def delete_history(hid):
    with connect() as c:
        return c.execute("DELETE FROM history WHERE id = ?", (hid,)).rowcount > 0