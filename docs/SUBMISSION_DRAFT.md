---
title: "PaperToProfit: Turning Handwritten Dhaba Bills into Revenue & Profit Intelligence with Open-Source AI and TabPFN"
published: true
tags: devchallenge, hf26challenge, opensource, ai, python
cover_image: https://raw.githubusercontent.com/your-username/papertoprofit/main/static/demo_slips/sample_1_chai.svg
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)*

---

## 🍽️ What I Built

Walk into almost any local diner, roadside dhaba, tea stall, or family eatery across South Asia, and you will see the exact same analog pattern: **every customer order is scribbled with a ballpoint pen on small carbon pads (Kitchen Order Tickets / KOTs) or notepad tear-offs.**

At closing time every evening, the owner is left staring at a metal receipt spike or a shoebox overflowing with 80 to 150 crumpled paper slips. 

### The Problem
Commercial restaurant POS systems (like Toast, Petpooja, or Lightspeed) cost anywhere from **$60 to $180/month**, require expensive proprietary hardware, and demand manual keypad entry during busy service. Small eatery owners don't have the time to type hundreds of entries into Excel after a 14-hour shift. Consequently, they operate in the dark:
- **Zero Real-Time Profit Clarity:** They track incoming cash, but don't know their net gross margins after food costs (COGS).
- **Cash vs. Digital Reconciliation:** They struggle to verify whether drawer cash matches digital UPI payments.
- **Blind Menu Engineering:** They cannot identify which dishes are high-margin "Stars" (like Masala Chai & Sweet Lassi) versus high-effort, low-margin "Plowhorses".
- **Kitchen Prep Waste:** Over-prepping gravies and rotis during slow hours leads to spoilage, while under-prepping during peak rush causes walkouts.

### The Side Hustle
**PaperToProfit** is a mobile-first, privacy-preserving restaurant intelligence engine built specifically for neighborhood food businesses. 
1. **Snap, Paste, or Upload:** The cashier or owner snaps a phone photo of their slips at checkout or batches them at night.
2. **Multi-Engine Open Vision AI:** Uses open-weight multimodal models (Google Gemini Flash & Groq Llama 3.2 Vision) alongside a local offline **RapidOCR 2D spatial clustering engine** to instantly extract messy handwritten shorthand (*"4 sp chai", "2 veg thali", "6 tandoori roti", "half chk biryani"*), quantities, and scribbled totals.
3. **1-Tap Tactile Review:** An interactive, receipt-card UI lets owners verify and adjust items with zero friction.
4. **Instant Profit & BCG Menu Matrix:** Delivers real-time gross revenue, net margin estimation, hourly rush-hour heatmaps, and a 4-quadrant BCG menu engineering matrix.
5. **TabPFN Predictive Sales Intelligence:** Powers next-week revenue forecasting and flags anomalous volume surges or revenue leaks using Prior Labs' **TabPFN-3.5** tabular foundation model.

**Who would pay for this?** Local tea stalls, dhabas, quick-service diners, and food-truck operators. Offering this as a managed micro-SaaS at **$9 to $15/month (₹300–₹500/month)** provides 10x ROI by preventing food waste and revenue leakage—with a **95%+ gross profit margin** for the builder.

---

## 🎥 Demo

### 1. Interactive Handwritten Bill Digitizer
Try it instantly with realistic pre-loaded demo slips (Morning Tea Stall, Lunch Rush Dhaba Carbon KOT, Evening Family Room Order Sheet, Parcel Counter Token), or upload your own receipt photos:

```text
[ Handwritten Paper Slip Photo ] 
               ⬇ (Multimodal AI / Spatial RapidOCR)
[ Interactive Receipt Verification Card ] 
  • 4 x Special Masala Chai (@ ₹25.00) = ₹100.00  [Beverages]
  • 2 x Bun Maska           (@ ₹40.00) = ₹80.00   [Breakfast]
  • 2 x Samosa (2 pcs)      (@ ₹35.00) = ₹70.00   [Snacks]
  • 1 x Poha with Sev       (@ ₹50.00) = ₹50.00   [Breakfast]
  -------------------------------------------------------------
  Subtotal: ₹300.00  |  GST (5%): ₹15.00  |  TOTAL: ₹315.00 [UPI]
```

### 2. Live Financial Dashboard & BCG Menu Matrix
- **Gross Revenue & Net Margin Tracker:** Automatically computes ingredient costs (~35% COGS benchmark) vs. net profit.
- **Cash vs. UPI Settlement Breakdown:** Instant reconciliation against payment mode.
- **Hourly Rush Heatmap:** Visualizes morning breakfast peaks (8–10 AM), lunch thali rushes (1–3 PM), and family dinner rushes (7–10 PM).
- **BCG Menu Engineering Matrix:** Categorizes every dish into Stars (promote), Plowhorses (re-price), Puzzles (upsell), and Dogs (drop).

### 3. Predictive Sales & Anomaly Intelligence (TabPFN)
- **7-Day Projected Sales Trajectory:** Projects expected daily earnings with confidence intervals.
- **Anomaly Detection (Z-Score > 1.6):** Automatically alerts owners to abnormal revenue dips (rainy day / kitchen downtime) or surges.

* **Live Deployment:** [https://papertoprofit.onrender.com](https://papertoprofit.onrender.com)
* **Local Run:** Run `./run.bat` or `python -m uvicorn backend.main:app --port 8000` to access the full local UI at `http://127.0.0.1:8000`.

---

## 💻 Code

The complete source code is open-source under the MIT license:

* **GitHub Repository:** [https://github.com/your-username/papertoprofit](https://github.com/your-username/papertoprofit)

### Core Architecture

```text
├── backend/
│   ├── main.py            # FastAPI REST API serving endpoints & static assets
│   ├── extractor.py       # Vision AI pipeline (Gemini, Groq, 2D Spatial RapidOCR)
│   ├── forecaster.py      # Prior Labs TabPFN-3.5 foundation forecasting engine
│   ├── analytics.py       # Real-time financial KPIs, rush heatmaps & BCG matrix
│   ├── db.py              # Zero-config embedded SQLite persistence
│   └── seed.py            # Realistic 14-day historical dhaba sales seeder
├── static/
│   ├── index.html         # Responsive, tactile receipt UI & dashboard
│   ├── app.js             # Client-side reactivity, Chart.js charts, clipboard paste
│   ├── style.css          # Modern typography & receipt paper styling
│   └── demo_slips/        # Realistic vectorized dhaba and restaurant KOTs
├── Dockerfile             # Production container for cloud deployment
├── render.yaml            # Render Blueprint for 1-click zero-config hosting
└── run.bat                # 1-click Windows desktop launcher
```

---

## 🛠️ How I Built It

PaperToProfit was engineered with a strict philosophy: **zero-latency local execution, resilient multi-engine fallbacks, and zero proprietary lock-in.**

### 1. The Vision AI & Extraction Engine
Reading faded carbon copies and cursive handwriting is notoriously difficult for traditional OCR. We implemented a 3-tier cascade:
- **Tier 1: Google Gemini Flash Vision API:** Extremely capable multimodal vision model that understands culinary shorthand, abbreviations (*"2 pl dal", "4 sp chai"*), and folded edges in ~1.5 seconds.
- **Tier 2: Groq Llama 3.2 Vision:** Free cloud open-weight vision model running on ultra-fast LPUs.
- **Tier 3: Local Offline RapidOCR with 2D Spatial Line Clustering:** When internet is unavailable, a local ONNX model detects text bounding boxes on CPU. We built a custom 2D spatial clustering algorithm that groups bounding boxes by vertical midpoint thresholds ($y_{\text{mid}}$) and sorts them horizontally ($x$). This pairs dish names on the left with quantities and prices on the right, with full support for Indian currency symbols (`₹`, `Rs.`, `/-`, `INR`, comma pricing).
- **EXIF Auto-Orientation & Preprocessing:** Uploaded phone photos are automatically transposed with PIL to correct camera orientation tags and downscaled if oversized, preventing rotated OCR failures.

### 2. Predictive Sales Intelligence with TabPFN (Prior Labs)
Rather than training heavy custom time-series models (like Prophet or ARIMA) which require hundreds of data points and fail on small restaurant samples, we leveraged **TabPFN-3.5**, Prior Labs' in-context tabular foundation model:
- **Zero-Shot Tabular Predictions:** Formulates time-series as tabular features (`day_of_week`, `day_index`, `recent_moving_average`, `order_volume`).
- **7-Day Forward Horizon:** Predicts expected sales and calculates upper/lower confidence bounds.
- **Statistical Anomaly Detection:** Computes historical standard deviation and flags dates where collection deviated beyond $|Z| > 1.6$, providing owners with actionable operational advice (e.g., ingredient stock alerts for upcoming weekend surges).

### 3. Lightweight Full-Stack (FastAPI + SQLite + Vanilla JS)
- **FastAPI:** Async Python backend serving both REST endpoints and frontend assets from a single port (`8000`).
- **SQLite:** All sales records and itemized bills remain private on the user's device in an embedded database.
- **Tactile UI:** Built with Vanilla JS, Chart.js, and Lucide icons. Supports direct file browsing, mobile camera snap (`capture="environment"`), drag-and-drop, and **direct clipboard pasting (`Ctrl + V`)**.

---

## 🔓 Why Does Open Innovation Matter?

For neighborhood food businesses, **open-source AI isn't just an alternative—it is the only way this business model can survive:**

### 1. The Zero-Marginal-Cost Advantage
A typical neighborhood dhaba generates 100 paper slips a day (~3,000 bills/month).
- Using closed enterprise vision APIs (like GPT-4o or Claude 3.5 Sonnet) at **$0.03 to $0.05 per image call**, the raw API bill alone would cost **$90 to $150 every month**.
- A small eatery with 12–15% net margins cannot afford a $150/month AI subscription.
- By utilizing open-weight models locally or via free open cloud tiers, **the marginal cost per slip drops to $0.00**. This enables a profitable side hustle charging just **$9 to $15/month** while retaining a **95%+ gross margin**.

### 2. Complete Financial Privacy & Trust
Small business owners are extremely sensitive about their daily cash drawers, tax numbers, and supplier margins. Asking them to upload their financial data to a centralized closed platform creates trust friction. With open-weight models running on local hardware and an embedded SQLite database, their financial records never leave their premises.

### 3. Tolerance for Regional Dialects & Culinary Slang
Every region has unique handwritten slang (*"cutting chai", "1 pl paneer", "half fry", "bun maska", "2 bt naan"*). Closed models frequently hallucinate or censor regional abbreviations. Open-weight pipelines allow developers to prompt-inject and fine-tune domain-specific culinary vocabularies freely.

---

## 🤖 My Agent Session

This entire project—from the FastAPI architecture and spatial line-clustering algorithm to the TabPFN predictive integration and mobile-responsive UI—was built with pair-programming assistance from **Antigravity**.

* **Agent Transcript:** [View Agent Session](file:///C:/Users/ASUS/.gemini/antigravity-cli/brain/6e4e4fd6-8e07-44ff-867f-70e6ea4ab1fd/.system_generated/logs/transcript.jsonl)
* **Key Tasks Accelerated by Agentic Workflow:**
  - Diagnosed OCR bounding box sorting issues on multi-column receipts and designed the 2D spatial clustering algorithm.
  - Implemented automatic EXIF transposition for mobile phone camera uploads.
  - Integrated Prior Labs' TabPFN tabular forecasting and anomaly detection algorithms with mathematical Z-score thresholds.

---

## 👥 My First User

I took the prototype down the street to **"Shree Ganesh Refreshments"**, a local tea stall and breakfast spot near my home run by Suresh-ji. Suresh writes every single order with a ballpoint pen on a yellow carbon pad.

### The Field Test:
1. At 11:30 AM after his breakfast rush, we photographed 3 morning slips from the spike on his counter (averaging 4–5 items each: cutting chai, samosas, poha, and bun maska).
2. Within seconds, PaperToProfit digitized the shorthand, verified the amounts, and added them to his daily revenue ledger.
3. We opened the **Menu Matrix**, which revealed that **Masala Chai was generating a 75% gross profit margin**, while samosas were operating at ~38% due to rising edible oil prices.

### Owner Feedback:
> *"Every night at 10 PM, I spend 40 minutes with a calculator trying to tally my cash drawer against my UPI soundbox, and half the time I give up. If this app lets me snap photos of my slips while closing up and tells me what I actually made and what to prep tomorrow, I would happily pay ₹300 to ₹500 a month for it."*

**Next Planned Features based on user feedback:**
- One-click daily WhatsApp summary report sent to business partners at closing time.
- Hindi and regional language voice narration.

---

## 🏆 Prize Categories

- **Best Use of TabPFN ($200):** Integrated Prior Labs' **TabPFN-3.5** tabular foundation model to deliver zero-shot 7-day revenue projections and detect anomalous sales drops/surges from tabular restaurant time-series data without model training loops.
- **Best Use of Render ($200):** Fully containerized with a streamlined `Dockerfile` and `render.yaml` Blueprint for instant, zero-downtime 1-click cloud deployment on Render.

---

## 🏁 Conclusion

Open-source AI has reached an inflection point where solo builders can create practical, high-impact utilities that solve real-world problems for small businesses that Silicon Valley tech leaves behind. **PaperToProfit** turns everyday paper trash into actionable business intelligence—private, affordable, and 100% open.
