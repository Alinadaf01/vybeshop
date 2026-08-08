/* ============================================================
   هُما — نمودارها و تعاملات صفحات داخلی
   ============================================================ */

(function () {
  "use strict";
  if (typeof Chart === "undefined") return;

  const toFa = (num, decimals = 0) =>
    Number(num).toLocaleString("fa-IR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const tooltipStyle = {
    backgroundColor: "rgba(14, 22, 38, 0.95)",
    borderColor: "rgba(16, 185, 129, 0.25)",
    borderWidth: 1,
    titleColor: "#fff",
    bodyColor: "#a7f3d0",
    padding: 12,
    cornerRadius: 12,
    titleFont: { weight: "700", size: 12 },
    bodyFont: { size: 11 },
    displayColors: false,
  };

  /* نمودار میله‌ای تحلیل‌ها */
  const analyticsBar = document.getElementById("analyticsBar");
  if (analyticsBar) {
    new Chart(analyticsBar, {
      type: "bar",
      data: {
        labels: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور"],
        datasets: [
          {
            label: "فروش (میلیون تومان)",
            data: [128, 165, 142, 198, 224, 284],
            backgroundColor: "rgba(16, 185, 129, 0.7)",
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: "بازدید (هزار)",
            data: [85, 102, 94, 118, 135, 162],
            backgroundColor: "rgba(34, 211, 238, 0.5)",
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1400, easing: "easeOutQuart" },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: { boxWidth: 10, boxHeight: 10, borderRadius: 3, useBorderRadius: true },
          },
          tooltip: {
            ...tooltipStyle,
            callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${toFa(ctx.parsed.y)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => toFa(v) },
            grid: { drawTicks: false },
            border: { display: false, dash: [4, 6] },
          },
        },
      },
    });
  }

  /* نمودار خطی نرخ تبدیل */
  const conversionChart = document.getElementById("conversionChart");
  if (conversionChart) {
    new Chart(conversionChart, {
      type: "line",
      data: {
        labels: ["هفته ۱", "هفته ۲", "هفته ۳", "هفته ۴"],
        datasets: [
          {
            label: "نرخ تبدیل (٪)",
            data: [2.8, 3.1, 3.4, 3.6],
            borderColor: "#22d3ee",
            backgroundColor: "rgba(34, 211, 238, 0.12)",
            fill: true,
            tension: 0.45,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: "#22d3ee",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipStyle,
            callbacks: { label: (ctx) => ` نرخ تبدیل: ${toFa(ctx.parsed.y, 1)}٪` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: {
            min: 0,
            max: 5,
            ticks: { callback: (v) => toFa(v) + "٪" },
            grid: { drawTicks: false },
            border: { display: false, dash: [4, 6] },
          },
        },
      },
    });
  }

  /* نمودار دسته‌بندی فروش */
  const categoryChart = document.getElementById("categoryChart");
  if (categoryChart) {
    new Chart(categoryChart, {
      type: "doughnut",
      data: {
        labels: ["الکترونیک", "پوشاک", "خانه و آشپزخانه", "ورزشی", "سایر"],
        datasets: [
          {
            data: [38, 24, 18, 12, 8],
            backgroundColor: ["#34d399", "#22d3ee", "#f59e0b", "#fb7185", "#64748b"],
            borderColor: "#0e1626",
            borderWidth: 4,
            hoverOffset: 8,
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 10, boxHeight: 10, padding: 16, useBorderRadius: true, borderRadius: 3 },
          },
          tooltip: {
            ...tooltipStyle,
            callbacks: { label: (ctx) => ` ${ctx.label}: ${toFa(ctx.parsed)}٪` },
          },
        },
      },
    });
  }

  /* نمودار دستگاه‌های کاربر */
  const deviceChart = document.getElementById("deviceChart");
  if (deviceChart) {
    new Chart(deviceChart, {
      type: "polarArea",
      data: {
        labels: ["موبایل", "دسکتاپ", "تبلت"],
        datasets: [
          {
            data: [62, 28, 10],
            backgroundColor: ["rgba(16,185,129,.7)", "rgba(34,211,238,.6)", "rgba(245,158,11,.5)"],
            borderColor: "#0e1626",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 10, boxHeight: 10, padding: 16 } },
          tooltip: {
            ...tooltipStyle,
            callbacks: { label: (ctx) => ` ${ctx.label}: ${toFa(ctx.parsed.r)}٪` },
          },
        },
        scales: { r: { display: false } },
      },
    });
  }

  /* اسپارک‌لاین‌های صفحات */
  const pageSparks = [
    { id: "orderSpark1", color: "#10b981", data: [18, 22, 19, 28, 24, 32, 29, 38] },
    { id: "orderSpark2", color: "#22d3ee", data: [8, 12, 10, 16, 14, 20, 18, 24] },
    { id: "orderSpark3", color: "#f59e0b", data: [14, 16, 12, 18, 15, 20, 17, 22] },
    { id: "orderSpark4", color: "#fb7185", data: [6, 8, 5, 9, 7, 11, 8, 10] },
    { id: "productSpark1", color: "#10b981", data: [120, 135, 128, 148, 142, 156, 150, 168] },
    { id: "productSpark2", color: "#22d3ee", data: [85, 92, 88, 98, 94, 102, 99, 108] },
    { id: "productSpark3", color: "#f59e0b", data: [12, 15, 18, 14, 20, 22, 19, 24] },
    { id: "productSpark4", color: "#fb7185", data: [4, 6, 5, 8, 7, 9, 6, 5] },
    { id: "customerSpark1", color: "#10b981", data: [820, 845, 870, 890, 910, 935, 960, 982] },
    { id: "customerSpark2", color: "#22d3ee", data: [42, 48, 55, 62, 68, 74, 82, 89] },
    { id: "customerSpark3", color: "#f59e0b", data: [18, 20, 22, 24, 26, 28, 30, 32] },
    { id: "customerSpark4", color: "#fb7185", data: [3.2, 3.0, 2.8, 2.6, 2.5, 2.4, 2.3, 2.1] },
  ];

  pageSparks.forEach(({ id, color, data }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const ctx = el.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 60);
    grad.addColorStop(0, color + "55");
    grad.addColorStop(1, color + "00");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((_, i) => i),
        datasets: [{ data, borderColor: color, backgroundColor: grad, fill: true, tension: 0.5, borderWidth: 2, pointRadius: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1600, easing: "easeOutQuart", delay: 300 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    });
  });

  /* فیلتر تب‌های سفارش */
  document.querySelectorAll("[data-order-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-order-filter]").forEach((b) => {
        b.classList.remove("bg-brand-500/15", "text-brand-300", "border-brand-500/30");
        b.classList.add("text-slate-400", "border-transparent");
      });
      btn.classList.add("bg-brand-500/15", "text-brand-300", "border-brand-500/30");
      btn.classList.remove("text-slate-400", "border-transparent");
    });
  });

  /* تب‌های نمایش محصولات */
  document.querySelectorAll("[data-view-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.viewToggle;
      document.querySelectorAll("[data-view-toggle]").forEach((b) => b.classList.remove("bg-brand-500/15", "text-brand-300"));
      btn.classList.add("bg-brand-500/15", "text-brand-300");
      document.getElementById("productGrid")?.classList.toggle("hidden", view === "list");
      document.getElementById("productList")?.classList.toggle("hidden", view === "grid");
    });
  });
})();
