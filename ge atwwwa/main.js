// === CONFIG / DEFAULTS ===
const ADMIN_PASSWORD = "adminpass"; // change to your real secret
const DEFAULTS = {
  wasteTotals: { organic: 125.5, anorganic: 78.3 }, // kg
  canteenPrices: [
    { item: "Nasi Goreng", price: 15000 },
    { item: "Mie Ayam", price: 12000 },
    { item: "Teh Botol", price: 5000 },
    { item: "Air Mineral", price: 4000 },
  ],
  // students & purchases will be persisted in later steps
};

// initialize localStorage if not present
function initDefaultsIfNeeded() {
  if (!localStorage.getItem("totalWaste")) {
    localStorage.setItem("totalWaste", JSON.stringify(DEFAULTS.wasteTotals));
  }
  if (!localStorage.getItem("canteenPrices")) {
    localStorage.setItem("canteenPrices", JSON.stringify(DEFAULTS.canteenPrices));
  }
  // ensure students/purchases exist as empty structures (will be used later)
  if (!localStorage.getItem("students")) {
    const sample = {
      "12345": { name: "Alya Putri", balance: 85000, totalWaste: { organic: 2.5, anorganic: 0.2 }, transactions: [] },
      "67890": { name: "Bima Pratama", balance: 45000, totalWaste: { organic: 1.0, anorganic: 0.1 }, transactions: [] },
    };
    localStorage.setItem("students", JSON.stringify(sample));
  }
  if (!localStorage.getItem("purchases")) {
    localStorage.setItem("purchases", JSON.stringify([]));
  }
}

// render values on index.html
function renderDashboard() {
  const wasteTotals = JSON.parse(localStorage.getItem("totalWaste") || "{}");
  const canteenPrices = JSON.parse(localStorage.getItem("canteenPrices") || "[]");

  const organicEl = document.getElementById("organicTotal");
  const anorganicEl = document.getElementById("anorganicTotal");
  const combinedEl = document.getElementById("combinedTotal");

  const organic = Number(wasteTotals.organic || 0);
  const anorganic = Number(wasteTotals.anorganic || 0);
  const combined = (organic + anorganic).toFixed(2);

  organicEl.textContent = `${organic.toFixed(2)} kg`;
  anorganicEl.textContent = `${anorganic.toFixed(2)} kg`;
  combinedEl.textContent = `${combined} kg`;

  const priceList = document.getElementById("priceList");
  priceList.innerHTML = "";
  canteenPrices.forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="item">${p.item}</span><span class="price">Rp ${numberWithCommas(p.price)}</span>`;
    priceList.appendChild(li);
  });
}

// login handling: student nis or admin password
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  const input = document.getElementById("loginInput");
  const feedback = document.getElementById("loginFeedback");

  btn.addEventListener("click", () => {
    const value = input.value.trim();
    if (!value) {
      showFeedback("Enter NIS or admin password", true);
      return;
    }

    if (value === ADMIN_PASSWORD) {
      // go to admin dashboard
      window.location.href = "admin.html";
      return;
    }

    // otherwise assume it's NIS -> go to student page with query param
    // but first check that nis exists in students storage
    const students = JSON.parse(localStorage.getItem("students") || "{}");
    if (!students[value]) {
      showFeedback("NIS not found. If you're admin, enter admin password.", true);
      return;
    }

    // redirect to student page with nis param
    window.location.href = `student.html?nis=${encodeURIComponent(value)}`;
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btn.click();
  });
});

function showFeedback(msg, isError = false) {
  const f = document.getElementById("loginFeedback");
  f.style.display = "block";
  f.style.color = isError ? "#b00020" : "#0b6b30";
  f.textContent = msg;
  setTimeout(() => (f.style.display = "none"), 4000);
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// === STUDENT DASHBOARD LOGIC ===
function loadStudentDashboard() {
  const params = new URLSearchParams(window.location.search);
  const nis = params.get("nis");
  const students = JSON.parse(localStorage.getItem("students") || "{}");

  if (!nis || !students[nis]) {
    alert("Invalid or missing NIS. Redirecting...");
    window.location.href = "index.html";
    return;
  }

  const student = students[nis];
  document.getElementById("studentName").textContent = student.name;
  document.getElementById("studentNIS").textContent = nis;
  document.getElementById("studentBalance").textContent = numberWithCommas(student.balance);
  document.getElementById("studentOrganic").textContent = `${student.totalWaste.organic} kg`;
  document.getElementById("studentAnorganic").textContent = `${student.totalWaste.anorganic} kg`;

  renderStudentTransactions(student.transactions || []);
  window.currentNIS = nis;
}

function renderStudentTransactions(transactions) {
  const tbody = document.getElementById("transactionTable");
  tbody.innerHTML = "";
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">No transactions yet.</td></tr>`;
    return;
  }

  transactions.forEach(trx => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${trx.date}</td>
      <td>${trx.type}</td>
      <td>${trx.detail}</td>
      <td>${numberWithCommas(trx.amount)}</td>`;
    tbody.appendChild(tr);
  });
}

// record purchase (subtract from balance + add transaction)
function recordPurchase() {
  const name = document.getElementById("itemName").value.trim();
  const price = parseInt(document.getElementById("itemPrice").value);
  const msgEl = document.getElementById("message");

  if (!name || isNaN(price) || price <= 0) {
    msgEl.textContent = "Please enter valid item and price.";
    return;
  }

  const nis = window.currentNIS;
  const students = JSON.parse(localStorage.getItem("students"));
  const student = students[nis];

  if (student.balance < price) {
    msgEl.textContent = "Not enough balance.";
    return;
  }

  student.balance -= price;
  const trx = {
    date: new Date().toLocaleString(),
    type: "Purchase",
    detail: name,
    amount: -price,
  };
  student.transactions.push(trx);

  localStorage.setItem("students", JSON.stringify(students));

  // update view
  document.getElementById("studentBalance").textContent = numberWithCommas(student.balance);
  renderStudentTransactions(student.transactions);
  msgEl.textContent = "Purchase recorded!";
  document.getElementById("itemName").value = "";
  document.getElementById("itemPrice").value = "";
}
// === ADMIN DASHBOARD LOGIC ===
function loadAdminDashboard() {
  const students = JSON.parse(localStorage.getItem("students") || "{}");
  renderStudentTable(students);
  renderAllTransactions(students);

  // Load total waste data
  const totalWaste = JSON.parse(localStorage.getItem("totalWaste") || '{"organic":0,"anorganic":0}');
  document.getElementById("totalOrganic").value = totalWaste.organic;
  document.getElementById("totalAnorganic").value = totalWaste.anorganic;
}

function renderStudentTable(students) {
  const tbody = document.getElementById("studentTable");
  tbody.innerHTML = "";

  Object.keys(students).forEach(nis => {
    const s = students[nis];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${nis}</td>
      <td>${s.name}</td>
      <td>${numberWithCommas(s.balance)}</td>
      <td>
        <input type="number" id="topup-${nis}" placeholder="Amount" style="width:90px;">
        <button onclick="topUpStudent('${nis}')">Top Up</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function renderAllTransactions(students) {
  const tbody = document.getElementById("adminTransactionTable");
  tbody.innerHTML = "";

  let allTransactions = [];
  Object.keys(students).forEach(nis => {
    const s = students[nis];
    (s.transactions || []).forEach(trx => {
      allTransactions.push({ nis, name: s.name, ...trx });
    });
  });

  if (allTransactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No transactions yet.</td></tr>`;
    return;
  }

  allTransactions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(trx => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${trx.nis}</td>
        <td>${trx.name}</td>
        <td>${trx.date}</td>
        <td>${trx.type}</td>
        <td>${trx.detail}</td>
        <td>${numberWithCommas(trx.amount)}</td>`;
      tbody.appendChild(tr);
    });
}

function topUpStudent(nis) {
  const amount = parseInt(document.getElementById(`topup-${nis}`).value);
  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid amount");
    return;
  }

  const students = JSON.parse(localStorage.getItem("students"));
  const student = students[nis];
  student.balance += amount;

  const trx = {
    date: new Date().toLocaleString(),
    type: "Top Up",
    detail: "Balance added by admin",
    amount: amount,
  };
  student.transactions.push(trx);

  localStorage.setItem("students", JSON.stringify(students));
  loadAdminDashboard();
}

function updateWaste() {
  const organic = parseFloat(document.getElementById("totalOrganic").value) || 0;
  const anorganic = parseFloat(document.getElementById("totalAnorganic").value) || 0;

  const totalWaste = { organic, anorganic };
  localStorage.setItem("totalWaste", JSON.stringify(totalWaste));

  document.getElementById("wasteMsg").textContent = "✅ Waste data updated!";

  // ✅ instantly update progress bars if they exist (when testing inside admin)
  if (typeof updateProgressBars === "function") {
    updateProgressBars();
  }

  // ✅ notify other tabs/pages (like index.html) to update their display
  window.dispatchEvent(new Event("storage"));

  setTimeout(() => {
    document.getElementById("wasteMsg").textContent = "";
  }, 2000);
}

// === THEME TOGGLE ===

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "☀️" : "🌙";
});

// === PROGRESS BAR UPDATE ===
function updateProgressBars() {
  const waste = JSON.parse(localStorage.getItem("totalWaste")) || {
    organic: 0,
    anorganic: 0
  };

  const organicDisplay = document.getElementById("totalOrganicDisplay");
  const anorganicDisplay = document.getElementById("totalAnorganicDisplay");
  const organicBar = document.getElementById("organicProgress");
  const anorganicBar = document.getElementById("anorganicProgress");

  if (organicDisplay) organicDisplay.textContent = waste.organic + " kg";
  if (anorganicDisplay) anorganicDisplay.textContent = waste.anorganic + " kg";

  if (organicBar) organicBar.style.width = Math.min(waste.organic, 100) + "%";
  if (anorganicBar) anorganicBar.style.width = Math.min(waste.anorganic, 100) + "%";
}


// Automatically apply theme & progress bars on page load
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  updateProgressBars();
});
// Auto-update total waste when admin changes it (even if both pages are open)
window.addEventListener("storage", () => {
  updateProgressBars();
});
setInterval(updateProgressBars, 1000);
