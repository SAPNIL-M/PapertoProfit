import sqlite3
import os
from typing import Dict, Any, List

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "papertoprofit.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                table_number TEXT DEFAULT 'Table 1',
                payment_method TEXT DEFAULT 'Cash',
                subtotal REAL DEFAULT 0.0,
                tax REAL DEFAULT 0.0,
                total_amount REAL DEFAULT 0.0,
                status TEXT DEFAULT 'verified',
                image_url TEXT,
                notes TEXT
            );
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS bill_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bill_id INTEGER,
                item_name TEXT NOT NULL,
                category TEXT DEFAULT 'Main Course',
                quantity INTEGER DEFAULT 1,
                unit_price REAL DEFAULT 0.0,
                total_price REAL DEFAULT 0.0,
                estimated_cogs_ratio REAL DEFAULT 0.35,
                FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
            );
        """)
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized at", DB_PATH)
