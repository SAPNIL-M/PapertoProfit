import os
import shutil
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Auto-load .env
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())
    except Exception:
        pass

from backend.db import init_db, get_db
from backend.extractor import extract_bill_data
from backend.analytics import compute_analytics
from backend.forecaster import run_tabpfn_forecast
from backend.seed import seed_sample_data

# Initialize database
init_db()

# Auto-seed if empty
conn = get_db()
count = conn.execute("SELECT COUNT(*) FROM bills").fetchone()[0]
conn.close()
if count < 5:
    seed_sample_data(14)

app = FastAPI(
    title="PaperToProfit API",
    description="Digitize handwritten paper restaurant bills with open-source AI and TabPFN analytics.",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Pydantic models for bill confirmation
class BillItemCreate(BaseModel):
    item_name: str
    category: str = "Main Course"
    quantity: int = 1
    unit_price: float = 0.0
    total_price: float = 0.0
    estimated_cogs_ratio: float = 0.35

class BillCreate(BaseModel):
    table_number: str = "Table 1"
    payment_method: str = "Cash"
    subtotal: float = 0.0
    tax: float = 0.0
    total_amount: float = 0.0
    image_url: str = ""
    notes: str = ""
    items: List[BillItemCreate] = []

class SettingsUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None

# Global runtime config
RUNTIME_CONFIG = {
    "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
    "groq_api_key": os.getenv("GROQ_API_KEY", "")
}

# --- API Endpoints ---

@app.get("/api/settings")
def get_settings():
    has_gemini = bool(RUNTIME_CONFIG["gemini_api_key"])
    has_groq = bool(RUNTIME_CONFIG["groq_api_key"])
    
    if has_gemini:
        active = "Google Gemini 3.8 Flash (Multimodal AI)"
    elif has_groq:
        active = "Llama 3.2 Vision (Groq Cloud)"
    else:
        active = "Local RapidOCR (100% Offline)"

    def mask(k):
        return (k[:4] + "..." + k[-4:]) if (k and len(k) > 8) else ""

    return {
        "has_gemini_key": has_gemini,
        "masked_gemini_key": mask(RUNTIME_CONFIG["gemini_api_key"]),
        "has_groq_key": has_groq,
        "masked_groq_key": mask(RUNTIME_CONFIG["groq_api_key"]),
        "active_engine": active
    }

@app.post("/api/settings")
def update_settings(settings: SettingsUpdate):
    if settings.gemini_api_key is not None:
        RUNTIME_CONFIG["gemini_api_key"] = settings.gemini_api_key.strip()
        os.environ["GEMINI_API_KEY"] = RUNTIME_CONFIG["gemini_api_key"]
    if settings.groq_api_key is not None:
        RUNTIME_CONFIG["groq_api_key"] = settings.groq_api_key.strip()
        os.environ["GROQ_API_KEY"] = RUNTIME_CONFIG["groq_api_key"]
    return {"status": "success", "message": "Vision AI settings saved successfully!"}

@app.post("/api/upload")
async def upload_bill_image(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    gemini_api_key: Optional[str] = Form(None),
    groq_api_key: Optional[str] = Form(None)
):
    """Uploads an image slip and runs the multimodal vision extraction pipeline."""
    try:
        clean_name = file.filename.replace(" ", "_")
        dest_path = os.path.join(UPLOAD_DIR, clean_name)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        eff_gemini = gemini_api_key or RUNTIME_CONFIG["gemini_api_key"]
        eff_groq = groq_api_key or api_key or RUNTIME_CONFIG["groq_api_key"]
        
        extracted_data = extract_bill_data(
            dest_path,
            filename=clean_name,
            gemini_api_key=eff_gemini,
            groq_api_key=eff_groq
        )
        extracted_data["image_url"] = f"/uploads/{clean_name}"
        return extracted_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR Extraction failed: {str(e)}")

@app.post("/api/bills")
def create_verified_bill(bill: BillCreate):
    """Saves confirmed bill and itemized dishes into SQLite."""
    conn = get_db()
    try:
        cur = conn.execute("""
            INSERT INTO bills (table_number, payment_method, subtotal, tax, total_amount, image_url, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'verified')
        """, (bill.table_number, bill.payment_method, bill.subtotal, bill.tax, bill.total_amount, bill.image_url, bill.notes))
        bill_id = cur.lastrowid

        for itm in bill.items:
            tot = itm.total_price if itm.total_price > 0 else (itm.unit_price * itm.quantity)
            conn.execute("""
                INSERT INTO bill_items (bill_id, item_name, category, quantity, unit_price, total_price, estimated_cogs_ratio)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (bill_id, itm.item_name, itm.category, itm.quantity, itm.unit_price, tot, itm.estimated_cogs_ratio))

        conn.commit()
        return {"status": "success", "bill_id": bill_id, "message": "Bill recorded into revenue ledger!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/bills")
def list_recent_bills(limit: int = 25):
    """Retrieves recent bills with their line items."""
    conn = get_db()
    rows = conn.execute("""
        SELECT * FROM bills ORDER BY id DESC LIMIT ?
    """, (limit,)).fetchall()
    
    bills = []
    for r in rows:
        b_dict = dict(r)
        items = conn.execute("SELECT * FROM bill_items WHERE bill_id = ?", (r["id"],)).fetchall()
        b_dict["items"] = [dict(i) for i in items]
        bills.append(b_dict)
    
    conn.close()
    return {"bills": bills}

@app.delete("/api/bills/{bill_id}")
def delete_bill(bill_id: int):
    """Deletes a bill and associated items."""
    conn = get_db()
    conn.execute("DELETE FROM bills WHERE id = ?", (bill_id,))
    conn.execute("DELETE FROM bill_items WHERE bill_id = ?", (bill_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "deleted_id": bill_id}

@app.get("/api/analytics")
def get_restaurant_analytics():
    """Returns real-time KPIs, revenue, profit, peak hours, and BCG menu matrix."""
    return compute_analytics()

@app.get("/api/forecast")
def get_tabpfn_forecast():
    """Runs TabPFN 7-day predictive forecast & anomaly detection."""
    analytics = compute_analytics()
    daily_history = analytics.get("daily_trend", [])
    return run_tabpfn_forecast(daily_history)

@app.get("/api/demo-slips")
def get_demo_slips():
    """Returns curated demo handwritten dhaba & restaurant slips for one-click testing."""
    return {
        "slips": [
            {
                "id": "sample_1_chai",
                "title": "Morning Tea Stall & Breakfast Pad",
                "badge": "Breakfast Rush",
                "filename": "sample_1_chai.png",
                "image_url": "/demo_slips/sample_1_chai.svg",
                "description": "Handwritten on small paper pad: 4 Masala Chai, 2 Bun Maska, Samosas & Poha.",
                "sample_total": "₹315.00"
            },
            {
                "id": "sample_2_thali",
                "title": "Lunch Rush Dhaba Carbon KOT",
                "badge": "Lunch Peak",
                "filename": "sample_2_thali.png",
                "image_url": "/demo_slips/sample_2_thali.svg",
                "description": "Carbon copy bill: 2 Special Veg Thalis, Dal Makhani, Tandoori Roti & Sweet Lassi.",
                "sample_total": "₹798.00"
            },
            {
                "id": "sample_3_dinner",
                "title": "Evening Family Room Order Sheet",
                "badge": "Dinner Family",
                "filename": "sample_3_dinner.png",
                "image_url": "/demo_slips/sample_3_dinner.svg",
                "description": "Full order sheet: Paneer Butter Masala, Garlic Naan, Chicken Dum Biryani, Desserts.",
                "sample_total": "₹1,564.50"
            },
            {
                "id": "sample_4_takeaway",
                "title": "Counter Parcel / Takeaway Slip",
                "badge": "Quick Takeaway",
                "filename": "sample_4_takeaway.png",
                "image_url": "/demo_slips/sample_4_takeaway.svg",
                "description": "Express counter token: Paneer Roll, Double Egg Chicken Roll, Thums Up cans.",
                "sample_total": "₹451.50"
            }
        ]
    }

@app.post("/api/demo-slips/seed")
def trigger_seed():
    """Reset / seed demo historical records."""
    seed_sample_data(14)
    return {"status": "success", "message": "14 days of realistic dhaba bills populated!"}

# Serve static frontend directly from /
STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
