// PaperToProfit Application Logic

let currentBill = {
  table_number: "Table 1",
  payment_method: "UPI",
  items: [],
  subtotal: 0.0,
  tax: 0.0,
  total_amount: 0.0,
  image_url: "",
  notes: ""
};

let chartDaily = null;
let chartPayment = null;
let chartHourly = null;
let chartForecast = null;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initUpload();
  initSettingsModal();
  loadDemoSlips();
  loadAnalytics();
  loadLedger();
  loadSettings();

  document.getElementById("btn-add-item").addEventListener("click", addEmptyItemRow);
  document.getElementById("btn-save-bill").addEventListener("click", saveVerifiedBill);
  document.getElementById("btn-export-csv").addEventListener("click", exportLedgerCSV);
  document.getElementById("btn-seed-data").addEventListener("click", resetSeedData);
  
  if (window.lucide) {
    lucide.createIcons();
  }
});

// Tab Switching
function initTabs() {
  const buttons = document.querySelectorAll(".nav-tab-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      buttons.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`tab-${target}`).classList.add("active");

      if (target === "dashboard") loadAnalytics();
      if (target === "menu") loadAnalytics();
      if (target === "forecast") loadForecast();
      if (target === "ledger") loadLedger();
    });
  });
}

// Vision AI Engine Settings
function initSettingsModal() {
  const modal = document.getElementById("settings-modal");
  const openBtn = document.getElementById("btn-open-settings");
  const closeBtn = document.getElementById("btn-close-settings");
  const cancelBtn = document.getElementById("btn-cancel-settings");
  const saveBtn = document.getElementById("btn-save-settings");
  const inputKey = document.getElementById("input-groq-key");

  openBtn.addEventListener("click", () => {
    const savedKey = localStorage.getItem("groq_api_key") || "";
    inputKey.value = savedKey;
    modal.style.display = "flex";
  });

  const closeModal = () => modal.style.display = "none";
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  saveBtn.addEventListener("click", async () => {
    const key = inputKey.value.trim();
    localStorage.setItem("groq_api_key", key);
    
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groq_api_key: key })
    });

    closeModal();
    loadSettings();
  });
}

async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    const badge = document.getElementById("active-engine-badge");
    const pill = document.getElementById("current-engine-pill");

    const localKey = localStorage.getItem("groq_api_key");
    const isGroqActive = data.has_groq_key || Boolean(localKey);

    if (isGroqActive) {
      badge.innerText = "Llama 3.2 Vision (Free Cloud)";
      pill.innerText = "Llama 3.2 Vision Active";
      pill.className = "badge badge-green";
    } else {
      badge.innerText = "Local OCR / Offline";
      pill.innerText = "Local OCR Active";
      pill.className = "badge badge-blue";
    }
  } catch (err) {
    console.error("Failed to load settings", err);
  }
}

// Demo Slips Loader
async function loadDemoSlips() {
  try {
    const res = await fetch("/api/demo-slips");
    const data = await res.json();
    const container = document.getElementById("demo-slips-container");
    container.innerHTML = "";

    data.slips.forEach(slip => {
      const card = document.createElement("div");
      card.className = "demo-slip-card";
      card.innerHTML = `
        <div class="demo-slip-img-wrap">
          <img src="${slip.image_url}" alt="${slip.title}">
        </div>
        <div style="padding: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
            <span class="badge badge-amber">${slip.badge}</span>
            <span style="font-weight: 800; color: #1e1b4b; font-size: 1.05rem;">${slip.sample_total}</span>
          </div>
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.3rem;">${slip.title}</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4;">${slip.description}</p>
          <div style="margin-top: 0.85rem; font-size: 0.8rem; font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 4px;">
            <span>Tap to Scan This Slip &rarr;</span>
          </div>
        </div>
      `;
      card.addEventListener("click", () => triggerDemoSlipOCR(slip));
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed loading demo slips", err);
  }
}

// Trigger OCR for Demo Slip
async function triggerDemoSlipOCR(slip) {
  const previewBox = document.getElementById("preview-box");
  const previewImg = document.getElementById("preview-img");
  const scanProgress = document.getElementById("scan-progress");

  previewBox.style.display = "block";
  previewImg.src = slip.image_url;
  scanProgress.style.display = "block";

  setTimeout(async () => {
    try {
      const res = await fetch(`/api/upload`, {
        method: "POST",
        body: await createMockFileFormData(slip.filename)
      });
      const data = await res.json();
      scanProgress.style.display = "none";
      populateReviewCard(data, slip.image_url);
    } catch (err) {
      scanProgress.style.display = "none";
      console.error(err);
    }
  }, 700);
}

// Helper to wrap demo file into FormData
async function createMockFileFormData(filename) {
  const blob = new Blob(["demo-slip-binary"], { type: "image/svg+xml" });
  const fd = new FormData();
  fd.append("file", blob, filename);
  return fd;
}

// Upload & Drag-and-Drop Handler
function initUpload() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      handleFileUpload(fileInput.files[0]);
    }
  });
}

async function handleFileUpload(file) {
  const previewBox = document.getElementById("preview-box");
  const previewImg = document.getElementById("preview-img");
  const scanProgress = document.getElementById("scan-progress");

  previewBox.style.display = "block";
  previewImg.src = URL.createObjectURL(file);
  scanProgress.style.display = "block";

  const fd = new FormData();
  fd.append("file", file);
  
  const savedKey = localStorage.getItem("groq_api_key");
  if (savedKey) {
    fd.append("api_key", savedKey);
  }

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd
    });
    const data = await res.json();
    scanProgress.style.display = "none";
    populateReviewCard(data, data.image_url || previewImg.src);
  } catch (err) {
    scanProgress.style.display = "none";
    alert("Extraction error: " + err.message);
  }
}

// Populate Receipt Review Card
function populateReviewCard(data, imgUrl) {
  currentBill = {
    table_number: data.table_number || "Table 1",
    payment_method: data.payment_method || "UPI",
    items: data.items || [],
    subtotal: data.subtotal || 0.0,
    tax: data.tax || 0.0,
    total_amount: data.total_amount || 0.0,
    image_url: imgUrl,
    notes: data.notes || "Digitized KOT Slip"
  };

  document.getElementById("review-table").value = currentBill.table_number;
  document.getElementById("review-payment").value = currentBill.payment_method;
  document.getElementById("review-notes").innerText = currentBill.notes;

  renderItemsTable();
}

function renderItemsTable() {
  const tbody = document.getElementById("review-items-tbody");
  tbody.innerHTML = "";

  currentBill.items.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input type="text" value="${item.item_name}" class="table-input" onchange="updateItemField(${index}, 'item_name', this.value)">
      </td>
      <td>
        <select class="table-input" onchange="updateItemField(${index}, 'category', this.value)">
          <option value="Main Course" ${item.category === 'Main Course' ? 'selected' : ''}>Main Course</option>
          <option value="Thali & Meals" ${item.category === 'Thali & Meals' ? 'selected' : ''}>Thali & Meals</option>
          <option value="Breads" ${item.category === 'Breads' ? 'selected' : ''}>Breads</option>
          <option value="Beverages" ${item.category === 'Beverages' ? 'selected' : ''}>Beverages</option>
          <option value="Breakfast" ${item.category === 'Breakfast' ? 'selected' : ''}>Breakfast</option>
          <option value="Snacks" ${item.category === 'Snacks' ? 'selected' : ''}>Snacks</option>
          <option value="Biryani & Rice" ${item.category === 'Biryani & Rice' ? 'selected' : ''}>Biryani & Rice</option>
          <option value="Desserts" ${item.category === 'Desserts' ? 'selected' : ''}>Desserts</option>
        </select>
      </td>
      <td style="text-align: center;">
        <input type="number" min="1" value="${item.quantity}" class="table-input" style="text-align: center;" onchange="updateItemField(${index}, 'quantity', parseInt(this.value) || 1)">
      </td>
      <td style="text-align: right;">
        <input type="number" step="0.5" value="${item.unit_price}" class="table-input" style="text-align: right;" onchange="updateItemField(${index}, 'unit_price', parseFloat(this.value) || 0.0)">
      </td>
      <td style="text-align: center;">
        <button style="background: none; border: none; color: #ef4444; cursor: pointer;" onclick="removeItemRow(${index})">
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  recalculateTotals();
  if (window.lucide) lucide.createIcons();
}

function updateItemField(index, field, value) {
  if (currentBill.items[index]) {
    currentBill.items[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      currentBill.items[index].total_price = currentBill.items[index].quantity * currentBill.items[index].unit_price;
    }
    recalculateTotals();
  }
}

function removeItemRow(index) {
  currentBill.items.splice(index, 1);
  renderItemsTable();
}

function addEmptyItemRow() {
  currentBill.items.push({
    item_name: "Special Masala Chai",
    category: "Beverages",
    quantity: 1,
    unit_price: 25.0,
    total_price: 25.0,
    estimated_cogs_ratio: 0.25
  });
  renderItemsTable();
}

function recalculateTotals() {
  let subtotal = 0.0;
  currentBill.items.forEach(itm => {
    subtotal += (itm.quantity * itm.unit_price);
  });

  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
  const total = Math.round((subtotal + tax) * 100) / 100;

  currentBill.subtotal = subtotal;
  currentBill.tax = tax;
  currentBill.total_amount = total;

  document.getElementById("review-subtotal").innerText = `₹ ${subtotal.toFixed(2)}`;
  document.getElementById("review-tax").innerText = `₹ ${tax.toFixed(2)}`;
  document.getElementById("review-total").innerText = `₹ ${total.toFixed(2)}`;
}

// Save Confirmed Bill to SQLite
async function saveVerifiedBill() {
  if (currentBill.items.length === 0) {
    alert("Please add at least one line item before saving!");
    return;
  }

  currentBill.table_number = document.getElementById("review-table").value;
  currentBill.payment_method = document.getElementById("review-payment").value;

  try {
    const res = await fetch("/api/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(currentBill)
    });
    const result = await res.json();
    
    // Animate button feedback
    const btn = document.getElementById("btn-save-bill");
    btn.innerHTML = `<i data-lucide="check-check"></i> Recorded into Revenue Ledger!`;
    btn.style.background = "#059669";
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      btn.innerHTML = `<i data-lucide="check"></i> Confirm &amp; Add to Revenue Ledger`;
      btn.style.background = "var(--success)";
      if (window.lucide) lucide.createIcons();
      
      // Navigate to Financials tab to see updated numbers
      document.querySelector('[data-tab="dashboard"]').click();
    }, 1000);

  } catch (err) {
    alert("Error recording bill: " + err.message);
  }
}

// Load Financial Analytics & Charts
async function loadAnalytics() {
  try {
    const res = await fetch("/api/analytics");
    const data = await res.json();

    const kpis = data.kpis;
    document.getElementById("kpi-revenue").innerText = `₹ ${kpis.total_revenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById("kpi-bills-count").innerText = `${kpis.total_bills} bills scanned`;
    document.getElementById("kpi-profit").innerText = `₹ ${kpis.estimated_net_profit.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById("kpi-margin-pct").innerText = `${kpis.overall_margin_pct}% estimated gross margin`;
    document.getElementById("kpi-cogs").innerText = `₹ ${kpis.estimated_cogs.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById("kpi-avg-ticket").innerText = `₹ ${kpis.avg_ticket.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

    renderDailyChart(data.daily_trend);
    renderPaymentChart(data.payment_breakdown);
    renderHourlyChart(data.hourly_distribution);
    renderMenuMatrix(data.menu_matrix, data.top_items);
  } catch (err) {
    console.error("Failed loading analytics", err);
  }
}

function renderDailyChart(dailyData) {
  const ctx = document.getElementById("chart-daily-revenue").getContext("2d");
  const labels = dailyData.map(d => d.date.slice(5)); // MM-DD
  const values = dailyData.map(d => d.revenue);

  if (chartDaily) chartDaily.destroy();

  chartDaily = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Daily Revenue (₹)",
        data: values,
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79, 70, 229, 0.08)",
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: "#4f46e5",
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: { callback: v => '₹' + v.toLocaleString() },
          grid: { color: "rgba(0,0,0,0.05)" }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderPaymentChart(breakdown) {
  const ctx = document.getElementById("chart-payment-methods").getContext("2d");
  const labels = breakdown.map(b => b.method);
  const values = breakdown.map(b => b.revenue);

  if (chartPayment) chartPayment.destroy();

  chartPayment = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ["#10b981", "#6366f1", "#f59e0b"],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

function renderHourlyChart(hourlyData) {
  const ctx = document.getElementById("chart-hourly").getContext("2d");
  const labels = hourlyData.map(h => h.time);
  const values = hourlyData.map(h => h.revenue);

  if (chartHourly) chartHourly.destroy();

  chartHourly = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Hourly Revenue (₹)",
        data: values,
        backgroundColor: "#0ea5e9",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => '₹' + v.toLocaleString() } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderMenuMatrix(matrix, topItems) {
  const renderList = (elId, items, color) => {
    const el = document.getElementById(elId);
    el.innerHTML = "";
    if (!items || items.length === 0) {
      el.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">No items currently in this quadrant.</p>`;
      return;
    }
    items.forEach(itm => {
      const row = document.createElement("div");
      row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem;";
      row.innerHTML = `
        <div>
          <span style="font-weight: 700;">${itm.name}</span>
          <span style="color: var(--text-muted); font-size: 0.75rem; display: block;">${itm.quantity} sold @ ₹${itm.unit_price}</span>
        </div>
        <span style="font-weight: 800; color: ${color};">${itm.margin_pct}% margin</span>
      `;
      el.appendChild(row);
    });
  };

  renderList("matrix-stars-list", matrix.stars, "#059669");
  renderList("matrix-plowhorses-list", matrix.plowhorses, "#d97706");
  renderList("matrix-puzzles-list", matrix.puzzles, "#2563eb");
  renderList("matrix-dogs-list", matrix.dogs, "#dc2626");

  // Detailed Top Items Table
  const tbody = document.getElementById("top-items-tbody");
  tbody.innerHTML = "";
  topItems.forEach(itm => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 600;">${itm.name}</td>
      <td><span class="badge badge-purple">${itm.category}</span></td>
      <td style="text-align: center; font-weight: 700;">${itm.quantity}</td>
      <td style="text-align: right;">₹ ${itm.unit_price}</td>
      <td style="text-align: right; font-weight: 700; color: var(--primary);">₹ ${itm.sales.toLocaleString('en-IN')}</td>
      <td style="text-align: right; font-weight: 700; color: #059669;">${itm.margin_pct}%</td>
    `;
    tbody.appendChild(tr);
  });
}

// TabPFN Forecast Loader
async function loadForecast() {
  try {
    const res = await fetch("/api/forecast");
    const data = await res.json();

    document.getElementById("forecast-total").innerText = `₹ ${data.projected_7day_total.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    document.getElementById("forecast-engine-badge").innerText = `Powered by: ${data.engine}`;

    // Render Forecast Chart
    const ctx = document.getElementById("chart-forecast").getContext("2d");
    const labels = data.daily_forecast.map(f => f.day);
    const predicted = data.daily_forecast.map(f => f.predicted_revenue);
    const upper = data.daily_forecast.map(f => f.upper_bound);
    const lower = data.daily_forecast.map(f => f.lower_bound);

    if (chartForecast) chartForecast.destroy();

    chartForecast = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Predicted Sales (₹)",
            data: predicted,
            borderColor: "#6366f1",
            backgroundColor: "rgba(99, 102, 241, 0.2)",
            borderWidth: 3,
            tension: 0.3
          },
          {
            label: "Upper Bound (92% Confidence)",
            data: upper,
            borderColor: "rgba(16, 185, 129, 0.4)",
            borderDash: [5, 5],
            fill: false,
            tension: 0.3
          },
          {
            label: "Lower Bound",
            data: lower,
            borderColor: "rgba(239, 68, 68, 0.4)",
            borderDash: [5, 5],
            fill: false,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { ticks: { callback: v => '₹' + v.toLocaleString() } }
        }
      }
    });

    // Render Anomalies
    const anomContainer = document.getElementById("anomalies-list");
    anomContainer.innerHTML = "";
    if (!data.anomalies_detected || data.anomalies_detected.length === 0) {
      anomContainer.innerHTML = `<div style="padding: 1rem; background: #f0fdf4; border-radius: var(--radius-md); color: #166534; font-size: 0.9rem;">No severe revenue deviations detected. Daily collections are stable.</div>`;
    } else {
      data.anomalies_detected.forEach(a => {
        const item = document.createElement("div");
        item.style.cssText = "padding: 0.85rem; border-radius: var(--radius-md); background: #fffbeb; border: 1px solid #fde68a; margin-bottom: 0.75rem;";
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 0.2rem;">
            <span>${a.date} (${a.type})</span>
            <span style="color: ${a.type === 'Surge' ? '#059669' : '#dc2626'};">${a.deviation_pct > 0 ? '+' : ''}${a.deviation_pct}%</span>
          </div>
          <p style="font-size: 0.8rem; color: #92400e;">${a.reason}</p>
        `;
        anomContainer.appendChild(item);
      });
    }

    // Render Insights
    const insContainer = document.getElementById("forecast-insights-list");
    insContainer.innerHTML = "";
    data.insights.forEach(ins => {
      const p = document.createElement("div");
      p.style.cssText = "display: flex; gap: 0.5rem; align-items: flex-start; font-size: 0.9rem; color: #1e293b;";
      p.innerHTML = `<span style="color: #10b981; font-weight: bold;">&bull;</span> <span>${ins}</span>`;
      insContainer.appendChild(p);
    });

  } catch (err) {
    console.error("Failed loading forecast", err);
  }
}

// Load All Scanned Bills Ledger
async function loadLedger() {
  try {
    const res = await fetch("/api/bills?limit=50");
    const data = await res.json();
    const tbody = document.getElementById("ledger-tbody");
    tbody.innerHTML = "";

    data.bills.forEach(b => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--text-muted);">#${b.id}</td>
        <td>${b.created_at}</td>
        <td style="font-weight: 600;">${b.table_number}</td>
        <td><span class="badge ${b.payment_method === 'UPI' ? 'badge-green' : 'badge-amber'}">${b.payment_method}</span></td>
        <td style="font-weight: 600;">${b.items ? b.items.length : 0} items</td>
        <td style="text-align: right; font-weight: 800; color: #1e1b4b;">₹ ${b.total_amount.toFixed(2)}</td>
        <td style="text-align: center;">
          <button style="background: none; border: none; color: #ef4444; cursor: pointer;" onclick="deleteBillRow(${b.id})">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Failed loading ledger", err);
  }
}

async function deleteBillRow(billId) {
  if (confirm(`Are you sure you want to delete Bill #${billId}?`)) {
    try {
      await fetch(`/api/bills/${billId}`, { method: "DELETE" });
      loadLedger();
      loadAnalytics();
    } catch (err) {
      alert("Failed to delete bill: " + err.message);
    }
  }
}

// Export CSV for Tax / Accountant
async function exportLedgerCSV() {
  try {
    const res = await fetch("/api/bills?limit=200");
    const data = await res.json();

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Bill_ID,Date,Table_Number,Payment_Method,Subtotal,Tax,Total_Amount,Items_Summary\n";

    data.bills.forEach(b => {
      const itemsSummary = (b.items || []).map(i => `${i.quantity}x ${i.item_name}`).join("; ");
      const row = [
        b.id,
        `"${b.created_at}"`,
        `"${b.table_number}"`,
        `"${b.payment_method}"`,
        b.subtotal,
        b.tax,
        b.total_amount,
        `"${itemsSummary}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `papertoprofit_sales_ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert("Export failed: " + err.message);
  }
}

// Reset / Seed 14 Days of Demo Data
async function resetSeedData() {
  if (confirm("Reset and seed 14 days of realistic dhaba sales records?")) {
    try {
      const res = await fetch("/api/demo-slips/seed", { method: "POST" });
      const r = await res.json();
      alert(r.message);
      loadAnalytics();
      loadLedger();
      loadForecast();
    } catch (err) {
      alert("Failed seeding: " + err.message);
    }
  }
}
