import sqlite3
from typing import Dict, Any, List
from backend.db import get_db

def compute_analytics() -> Dict[str, Any]:
    """Calculates comprehensive restaurant financial & operational metrics from SQLite."""
    conn = get_db()
    
    # 1. Total Bills & Revenue
    bill_row = conn.execute("""
        SELECT 
            COUNT(*) as total_bills,
            COALESCE(SUM(total_amount), 0.0) as total_revenue,
            COALESCE(SUM(subtotal), 0.0) as total_subtotal,
            COALESCE(SUM(tax), 0.0) as total_tax,
            COALESCE(AVG(total_amount), 0.0) as avg_ticket
        FROM bills
    """).fetchone()

    total_bills = bill_row["total_bills"]
    total_revenue = bill_row["total_revenue"]
    avg_ticket = bill_row["avg_ticket"]

    # 2. Payment Method Split (Cash vs UPI vs Card)
    payment_rows = conn.execute("""
        SELECT 
            payment_method,
            COUNT(*) as count,
            COALESCE(SUM(total_amount), 0.0) as revenue
        FROM bills
        GROUP BY payment_method
    """).fetchall()

    payment_breakdown = [
        {"method": r["payment_method"], "count": r["count"], "revenue": r["revenue"]}
        for r in payment_rows
    ]

    # 3. Item Level Stats & Margin Estimation
    item_rows = conn.execute("""
        SELECT 
            item_name,
            category,
            SUM(quantity) as total_qty,
            AVG(unit_price) as avg_price,
            SUM(total_price) as total_sales,
            AVG(estimated_cogs_ratio) as cogs_ratio
        FROM bill_items
        GROUP BY item_name
        ORDER BY total_sales DESC
    """).fetchall()

    top_items = []
    total_cogs = 0.0
    for r in item_rows:
        sales = r["total_sales"]
        cogs = sales * r["cogs_ratio"]
        total_cogs += cogs
        margin = sales - cogs
        top_items.append({
            "name": r["item_name"],
            "category": r["category"],
            "quantity": r["total_qty"],
            "unit_price": round(r["avg_price"], 2),
            "sales": round(sales, 2),
            "margin_amount": round(margin, 2),
            "margin_pct": round((margin / sales) * 100, 1) if sales > 0 else 0.0
        })

    estimated_net_profit = total_revenue - total_cogs
    overall_margin_pct = (estimated_net_profit / total_revenue * 100) if total_revenue > 0 else 0.0

    # 4. Menu Engineering Matrix (BCG Classification)
    # Median quantity and median margin %
    menu_matrix = {"stars": [], "plowhorses": [], "puzzles": [], "dogs": []}
    if top_items:
        median_qty = sorted([i["quantity"] for i in top_items])[len(top_items) // 2]
        median_margin = 60.0 # 60% threshold
        for item in top_items:
            high_vol = item["quantity"] >= median_qty
            high_margin = item["margin_pct"] >= median_margin
            
            if high_vol and high_margin:
                menu_matrix["stars"].append(item)
            elif high_vol and not high_margin:
                menu_matrix["plowhorses"].append(item)
            elif not high_vol and high_margin:
                menu_matrix["puzzles"].append(item)
            else:
                menu_matrix["dogs"].append(item)

    # 5. Hourly Peak Distribution
    hourly_rows = conn.execute("""
        SELECT 
            strftime('%H', created_at) as hour_str,
            COUNT(*) as bill_count,
            SUM(total_amount) as hourly_revenue
        FROM bills
        GROUP BY hour_str
        ORDER BY hour_str ASC
    """).fetchall()

    # Pre-populate all meal intervals
    hourly_map = {f"{h:02d}:00": 0.0 for h in range(8, 24)}
    for r in hourly_rows:
        try:
            h_key = f"{int(r['hour_str']):02d}:00"
            if h_key in hourly_map:
                hourly_map[h_key] = round(r["hourly_revenue"], 2)
        except Exception:
            pass

    hourly_distribution = [
        {"time": k, "revenue": v} for k, v in hourly_map.items()
    ]

    # 6. Daily Trend (Last 14 Days)
    daily_rows = conn.execute("""
        SELECT 
            strftime('%Y-%m-%d', created_at) as day_date,
            COUNT(*) as order_count,
            SUM(total_amount) as daily_revenue
        FROM bills
        GROUP BY day_date
        ORDER BY day_date ASC
        LIMIT 14
    """).fetchall()

    daily_trend = [
        {"date": r["day_date"], "orders": r["order_count"], "revenue": round(r["daily_revenue"], 2)}
        for r in daily_rows
    ]

    conn.close()

    return {
        "kpis": {
            "total_bills": total_bills,
            "total_revenue": round(total_revenue, 2),
            "estimated_cogs": round(total_cogs, 2),
            "estimated_net_profit": round(estimated_net_profit, 2),
            "overall_margin_pct": round(overall_margin_pct, 1),
            "avg_ticket": round(avg_ticket, 2)
        },
        "payment_breakdown": payment_breakdown,
        "top_items": top_items[:8],
        "menu_matrix": menu_matrix,
        "hourly_distribution": hourly_distribution,
        "daily_trend": daily_trend
    }
