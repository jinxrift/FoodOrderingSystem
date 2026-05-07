import sqlite3
import json
import os
from datetime import datetime
from flask import Flask, request, jsonify, g

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "food_ordering.db")

# ── DB helpers ──────────────────────────────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode=WAL")
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db:
        db.close()

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.executescript("""
        CREATE TABLE IF NOT EXISTS categories (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS menu_items (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL REFERENCES categories(id),
            name        TEXT NOT NULL,
            description TEXT,
            price       REAL NOT NULL,
            image_emoji TEXT NOT NULL,
            available   INTEGER NOT NULL DEFAULT 1,
            tags        TEXT DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS customers (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            email      TEXT UNIQUE NOT NULL,
            phone      TEXT,
            address    TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS orders (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id  INTEGER REFERENCES customers(id),
            status       TEXT NOT NULL DEFAULT 'pending',
            total        REAL NOT NULL DEFAULT 0,
            notes        TEXT,
            created_at   TEXT DEFAULT (datetime('now')),
            updated_at   TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id     INTEGER NOT NULL REFERENCES orders(id),
            menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
            quantity     INTEGER NOT NULL DEFAULT 1,
            unit_price   REAL NOT NULL,
            subtotal     REAL NOT NULL
        );
    """)

    # Seed data if empty
    row = db.execute("SELECT COUNT(*) as n FROM categories").fetchone()
    if row["n"] == 0:
        cats = [
            ("Burgers", "🍔"),
            ("Pizza", "🍕"),
            ("Sushi", "🍣"),
            ("Salads", "🥗"),
            ("Desserts", "🍰"),
            ("Drinks", "🥤"),
        ]
        db.executemany("INSERT INTO categories(name,icon) VALUES(?,?)", cats)

        items = [
            # Burgers
            (1, "Classic Smash Burger", "Double smash patty, cheddar, pickles, special sauce", 12.99, "🍔", 1, '["bestseller"]'),
            (1, "BBQ Bacon Burger", "Smoked bacon, caramelised onions, BBQ sauce, jalapeños", 14.99, "🥩", 1, '["spicy"]'),
            (1, "Mushroom Swiss", "Sautéed portobello, gruyère, garlic aioli", 13.49, "🍄", 1, '["veggie"]'),
            # Pizza
            (2, "Margherita", "San Marzano tomato, buffalo mozzarella, fresh basil", 13.99, "🍕", 1, '["veggie"]'),
            (2, "Pepperoni Royale", "Double pepperoni, mozzarella, tomato sauce", 15.99, "🔥", 1, '["bestseller"]'),
            (2, "Truffle Funghi", "Wild mushrooms, truffle oil, parmesan, rocket", 17.49, "🫚", 1, '[]'),
            # Sushi
            (3, "Salmon Nigiri (6pc)", "Fresh Atlantic salmon over seasoned rice", 14.99, "🐟", 1, '[]'),
            (3, "Dragon Roll (8pc)", "Shrimp tempura, avocado, cucumber, tobiko", 16.99, "🦐", 1, '["bestseller"]'),
            (3, "Spicy Tuna Roll (8pc)", "Tuna, cucumber, spicy mayo, sesame", 15.49, "🌶️", 1, '["spicy"]'),
            # Salads
            (4, "Caesar Royale", "Romaine, parmesan crisps, anchovies, house Caesar", 10.99, "🥬", 1, '[]'),
            (4, "Greek Village", "Feta, olives, cucumber, tomatoes, oregano", 11.49, "🫒", 1, '["veggie"]'),
            # Desserts
            (5, "Crème Brûlée", "Classic vanilla custard, caramelised sugar crust", 7.99, "🍮", 1, '[]'),
            (5, "Chocolate Lava Cake", "Warm dark chocolate cake, vanilla ice cream", 8.49, "🍫", 1, '["bestseller"]'),
            # Drinks
            (6, "Fresh Lemonade", "House-squeezed lemon, mint, sparkling water", 4.49, "🍋", 1, '[]'),
            (6, "Mango Lassi", "Fresh mango, yoghurt, cardamom", 5.49, "🥭", 1, '[]'),
            (6, "Cold Brew Coffee", "12-hour steep, served over ice", 4.99, "☕", 1, '[]'),
        ]
        db.executemany(
            "INSERT INTO menu_items(category_id,name,description,price,image_emoji,available,tags) VALUES(?,?,?,?,?,?,?)",
            items,
        )

        # Seed customers
        customers = [
            ("Alice Johnson", "alice@example.com", "+44 7700 900001", "12 Baker St, London"),
            ("Bob Smith", "bob@example.com", "+44 7700 900002", "221B Baker St, London"),
        ]
        db.executemany(
            "INSERT INTO customers(name,email,phone,address) VALUES(?,?,?,?)", customers
        )

    db.commit()
    db.close()

# ── CORS helper ─────────────────────────────────────────────────────────────

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    return response

@app.route("/<path:p>", methods=["OPTIONS"])
@app.route("/", methods=["OPTIONS"])
def options(p=None):
    return jsonify({}), 200

# ── Categories ───────────────────────────────────────────────────────────────

@app.route("/api/categories")
def get_categories():
    rows = get_db().execute("SELECT * FROM categories ORDER BY id").fetchall()
    return jsonify([dict(r) for r in rows])

# ── Menu Items ───────────────────────────────────────────────────────────────

@app.route("/api/menu")
def get_menu():
    cat_id = request.args.get("category_id")
    q = """SELECT m.*, c.name as category_name, c.icon as category_icon
           FROM menu_items m JOIN categories c ON m.category_id = c.id"""
    params = []
    if cat_id:
        q += " WHERE m.category_id = ?"
        params.append(cat_id)
    q += " ORDER BY m.id"
    rows = get_db().execute(q, params).fetchall()
    items = []
    for r in rows:
        d = dict(r)
        d["tags"] = json.loads(d["tags"] or "[]")
        items.append(d)
    return jsonify(items)

@app.route("/api/menu/<int:item_id>")
def get_menu_item(item_id):
    row = get_db().execute(
        "SELECT m.*, c.name as category_name FROM menu_items m JOIN categories c ON m.category_id=c.id WHERE m.id=?",
        (item_id,)
    ).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    d = dict(row)
    d["tags"] = json.loads(d["tags"] or "[]")
    return jsonify(d)

@app.route("/api/menu", methods=["POST"])
def create_menu_item():
    data = request.get_json()
    db = get_db()
    cur = db.execute(
        "INSERT INTO menu_items(category_id,name,description,price,image_emoji,available,tags) VALUES(?,?,?,?,?,?,?)",
        (data["category_id"], data["name"], data.get("description",""), data["price"],
         data.get("image_emoji","🍽️"), data.get("available", 1), json.dumps(data.get("tags",[])))
    )
    db.commit()
    return jsonify({"id": cur.lastrowid}), 201

@app.route("/api/menu/<int:item_id>", methods=["PUT"])
def update_menu_item(item_id):
    data = request.get_json()
    db = get_db()
    db.execute(
        "UPDATE menu_items SET name=?,description=?,price=?,available=?,tags=? WHERE id=?",
        (data["name"], data.get("description",""), data["price"],
         data.get("available",1), json.dumps(data.get("tags",[])), item_id)
    )
    db.commit()
    return jsonify({"ok": True})

# ── Customers ────────────────────────────────────────────────────────────────

@app.route("/api/customers")
def get_customers():
    rows = get_db().execute("SELECT * FROM customers ORDER BY name").fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/customers", methods=["POST"])
def create_customer():
    data = request.get_json()
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO customers(name,email,phone,address) VALUES(?,?,?,?)",
            (data["name"], data["email"], data.get("phone",""), data.get("address",""))
        )
        db.commit()
        return jsonify({"id": cur.lastrowid}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 409

# ── Orders ───────────────────────────────────────────────────────────────────

@app.route("/api/orders")
def get_orders():
    rows = get_db().execute("""
        SELECT o.*, c.name as customer_name
        FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
        ORDER BY o.created_at DESC LIMIT 100
    """).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route("/api/orders/<int:order_id>")
def get_order(order_id):
    db = get_db()
    order = db.execute(
        "SELECT o.*, c.name as customer_name, c.email as customer_email, c.address as customer_address "
        "FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.id=?",
        (order_id,)
    ).fetchone()
    if not order:
        return jsonify({"error": "Not found"}), 404
    items = db.execute(
        "SELECT oi.*, m.name as item_name, m.image_emoji FROM order_items oi "
        "JOIN menu_items m ON oi.menu_item_id=m.id WHERE oi.order_id=?",
        (order_id,)
    ).fetchall()
    result = dict(order)
    result["items"] = [dict(i) for i in items]
    return jsonify(result)

@app.route("/api/orders", methods=["POST"])
def create_order():
    data = request.get_json()
    db = get_db()

    # Validate items
    cart = data.get("items", [])
    if not cart:
        return jsonify({"error": "Cart is empty"}), 400

    # Fetch prices from DB (never trust client prices)
    total = 0.0
    resolved = []
    for entry in cart:
        row = db.execute("SELECT id, price FROM menu_items WHERE id=? AND available=1", (entry["menu_item_id"],)).fetchone()
        if not row:
            return jsonify({"error": f"Item {entry['menu_item_id']} unavailable"}), 400
        qty = int(entry["quantity"])
        sub = round(row["price"] * qty, 2)
        total += sub
        resolved.append((entry["menu_item_id"], qty, row["price"], sub))

    # Get or create customer
    customer_id = data.get("customer_id")
    if not customer_id and data.get("customer_email"):
        row = db.execute("SELECT id FROM customers WHERE email=?", (data["customer_email"],)).fetchone()
        if row:
            customer_id = row["id"]
        else:
            cur = db.execute(
                "INSERT INTO customers(name,email,phone,address) VALUES(?,?,?,?)",
                (data.get("customer_name","Guest"), data["customer_email"],
                 data.get("customer_phone",""), data.get("customer_address",""))
            )
            customer_id = cur.lastrowid

    cur = db.execute(
        "INSERT INTO orders(customer_id, status, total, notes) VALUES(?,?,?,?)",
        (customer_id, "pending", round(total, 2), data.get("notes",""))
    )
    order_id = cur.lastrowid

    db.executemany(
        "INSERT INTO order_items(order_id,menu_item_id,quantity,unit_price,subtotal) VALUES(?,?,?,?,?)",
        [(order_id, mid, qty, up, sub) for mid, qty, up, sub in resolved]
    )
    db.commit()
    return jsonify({"id": order_id, "total": round(total, 2)}), 201

@app.route("/api/orders/<int:order_id>/status", methods=["PATCH"])
def update_order_status(order_id):
    data = request.get_json()
    new_status = data.get("status")
    valid = {"pending", "confirmed", "preparing", "ready", "delivered", "cancelled"}
    if new_status not in valid:
        return jsonify({"error": "Invalid status"}), 400
    db = get_db()
    db.execute(
        "UPDATE orders SET status=?, updated_at=datetime('now') WHERE id=?",
        (new_status, order_id)
    )
    db.commit()
    return jsonify({"ok": True})

# ── Stats ────────────────────────────────────────────────────────────────────

@app.route("/api/stats")
def get_stats():
    db = get_db()
    total_orders = db.execute("SELECT COUNT(*) as n FROM orders").fetchone()["n"]
    total_revenue = db.execute("SELECT COALESCE(SUM(total),0) as s FROM orders WHERE status != 'cancelled'").fetchone()["s"]
    pending = db.execute("SELECT COUNT(*) as n FROM orders WHERE status='pending'").fetchone()["n"]
    today_orders = db.execute(
        "SELECT COUNT(*) as n FROM orders WHERE date(created_at)=date('now')"
    ).fetchone()["n"]
    popular = db.execute("""
        SELECT m.name, m.image_emoji, SUM(oi.quantity) as qty
        FROM order_items oi JOIN menu_items m ON oi.menu_item_id=m.id
        GROUP BY oi.menu_item_id ORDER BY qty DESC LIMIT 3
    """).fetchall()
    return jsonify({
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "pending_orders": pending,
        "today_orders": today_orders,
        "popular_items": [dict(r) for r in popular],
    })

if __name__ == "__main__":
    init_db()
    print("✅ Database initialised at", DB_PATH)
    app.run(port=5050, debug=True)
