import random
from datetime import datetime, timedelta
from backend.db import get_db, init_db

MENU_ITEMS = [
    # (name, category, price, cogs_ratio)
    ("Special Masala Chai", "Beverages", 25.0, 0.20),
    ("Cutting Chai", "Beverages", 15.0, 0.20),
    ("Sweet Punjabi Lassi", "Beverages", 60.0, 0.30),
    ("Bun Maska", "Breakfast", 40.0, 0.25),
    ("Samosa (2 pcs)", "Snacks", 35.0, 0.30),
    ("Poha with Sev", "Breakfast", 50.0, 0.25),
    ("Special Veg Thali", "Thali & Meals", 190.0, 0.40),
    ("Dal Makhani (Full)", "Main Course", 220.0, 0.35),
    ("Dal Tadka", "Main Course", 160.0, 0.30),
    ("Paneer Butter Masala", "Main Course", 240.0, 0.40),
    ("Tandoori Butter Roti", "Breads", 20.0, 0.25),
    ("Garlic Naan", "Breads", 60.0, 0.30),
    ("Chicken Dum Biryani", "Biryani & Rice", 280.0, 0.45),
    ("Jeera Rice", "Biryani & Rice", 140.0, 0.25),
    ("Paneer Tikka Roll", "Snacks", 110.0, 0.35),
    ("Gulab Jamun (2 pcs)", "Desserts", 50.0, 0.25)
]

def seed_sample_data(num_days: int = 14):
    init_db()
    conn = get_db()
    
    # Check if already seeded
    existing = conn.execute("SELECT COUNT(*) FROM bills").fetchone()[0]
    if existing > 10:
        print(f"Database already contains {existing} bills.")
        conn.close()
        return

    now = datetime.now()
    payment_choices = ["Cash", "UPI", "UPI", "Cash", "Card"] # Cash & UPI dominant in dhabas
    
    print(f"Seeding {num_days} days of realistic dhaba bills...")
    for day_offset in range(num_days, -1, -1):
        day_date = now - timedelta(days=day_offset)
        # Weekends have more traffic
        is_weekend = day_date.weekday() in [4, 5, 6] # Fri, Sat, Sun
        bills_count = random.randint(18, 30) if is_weekend else random.randint(10, 20)

        for b in range(bills_count):
            # Cluster hours around meal rushes: 9-11 (breakfast), 12-15 (lunch), 19-23 (dinner)
            meal_slot = random.choices([9, 10, 13, 14, 17, 20, 21, 22], weights=[15, 10, 25, 20, 10, 30, 35, 25])[0]
            created_at = day_date.replace(hour=meal_slot, minute=random.randint(0, 59), second=random.randint(0, 59))
            
            # Select 2 to 5 random items for this table
            selected_items = random.sample(MENU_ITEMS, k=random.randint(2, 5))
            
            bill_items_data = []
            subtotal = 0.0
            
            for name, cat, price, cogs in selected_items:
                qty = random.choices([1, 2, 3, 4, 6], weights=[45, 30, 15, 8, 2])[0]
                tot = price * qty
                subtotal += tot
                bill_items_data.append((name, cat, qty, price, tot, cogs))
            
            tax = round(subtotal * 0.05, 2) # 5% GST
            total = round(subtotal + tax, 2)
            table_no = f"Table {random.randint(1, 15)}" if random.random() > 0.25 else "Takeaway Parcel"
            pay_method = random.choice(payment_choices)

            cur = conn.execute("""
                INSERT INTO bills (created_at, table_number, payment_method, subtotal, tax, total_amount, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)
            """, (created_at.strftime("%Y-%m-%d %H:%M:%S"), table_no, pay_method, subtotal, tax, total, "Digitized Dhaba KOT Slip"))
            bill_id = cur.lastrowid

            for name, cat, qty, price, tot, cogs in bill_items_data:
                conn.execute("""
                    INSERT INTO bill_items (bill_id, item_name, category, quantity, unit_price, total_price, estimated_cogs_ratio)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (bill_id, name, cat, qty, price, tot, cogs))

    conn.commit()
    conn.close()
    print("Database seeding completed!")

if __name__ == "__main__":
    seed_sample_data(14)
