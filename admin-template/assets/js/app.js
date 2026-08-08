/* ============================================================
   هُما — پنل مدیریت هوشمند
   منطق تعاملات و انیمیشن‌های داشبورد
   ============================================================ */

(function () {
  "use strict";

  /* نگهداری نمونه‌های نمودار برای بازچینش هنگام تغییر سایز */
  const chartInstances = [];
  const registerChart = (c) => chartInstances.push(c);

  /* ---------- ابزار تبدیل ارقام به فارسی ---------- */
  const toFa = (num, decimals = 0) =>
    Number(num).toLocaleString("fa-IR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  /* ============================================================
     ۱) شمارنده‌های متحرک با easing نرم
     ============================================================ */
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function animateCounter(el) {
    const target = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const duration = 1600;
    let start = null;

    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const value = target * easeOutExpo(progress);
      el.textContent = toFa(value, decimals);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  document.querySelectorAll("[data-counter]").forEach(animateCounter);

  /* ============================================================
     ۲) حلقه هدف ماهانه
     ============================================================ */
  const ring = document.getElementById("goalRing");
  if (ring) {
    const circumference = 2 * Math.PI * 52; // 326.7
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = circumference * (1 - 0.78);
    });
  }

  /* ============================================================
     ۳) نوارهای پیشرفت محصولات (با مشاهده‌گر ورود به دید)
     ============================================================ */
  const progressObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          bar.style.width = bar.dataset.progress + "%";
          progressObserver.unobserve(bar);
        }
      });
    },
    { threshold: 0.4 }
  );
  document.querySelectorAll(".progress-bar").forEach((bar) => progressObserver.observe(bar));

  /* ============================================================
     ۴) ساعت زنده و تاریخ شمسی
     ============================================================ */
  const clockEl = document.getElementById("liveClock");
  const dateEl = document.getElementById("todayDate");

  if (clockEl && dateEl) {
    function tick() {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    dateEl.textContent = new Date().toLocaleDateString("fa-IR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    tick();
    setInterval(tick, 1000);
  }

  /* ============================================================
     ۵) سایدبار موبایل
     ============================================================ */
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const menuBtn = document.getElementById("menuBtn");

  function openSidebar() {
    sidebar.classList.remove("translate-x-full");
    overlay.classList.remove("hidden");
    requestAnimationFrame(() => overlay.classList.add("opacity-100"));
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    if (window.innerWidth < 1024) sidebar.classList.add("translate-x-full");
    overlay.classList.add("hidden");
    document.body.style.overflow = "";
  }
  menuBtn.addEventListener("click", openSidebar);
  overlay.addEventListener("click", closeSidebar);
  document.getElementById("closeSidebarBtn").addEventListener("click", closeSidebar);
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove("translate-x-full");
      overlay.classList.add("hidden");
      document.body.style.overflow = "";
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });

  /* بعد از پایان انیمیشن سایدبار، نمودارها را با ابعاد جدید بازچینش کن */
  sidebar.addEventListener("transitionend", (e) => {
    if (e.propertyName === "transform") {
      chartInstances.forEach((c) => c.resize());
    }
  });

  /* ============================================================
     ۶) دراپ‌داون اعلان‌ها و پروفایل
     ============================================================ */
  const notifBtn = document.getElementById("notifBtn");
  const notifDropdown = document.getElementById("notifDropdown");
  const profileBtn = document.getElementById("profileBtn");
  const profileDropdown = document.getElementById("profileDropdown");
  const profileChevron = document.getElementById("profileChevron");
  let notifOpen = false;
  let profileOpen = false;

  function toggleNotif(force) {
    if (!notifDropdown) return;
    notifOpen = force !== undefined ? force : !notifOpen;
    notifDropdown.classList.toggle("invisible", !notifOpen);
    notifDropdown.classList.toggle("opacity-0", !notifOpen);
    notifDropdown.classList.toggle("scale-95", !notifOpen);
    if (notifOpen) toggleProfile(false);
  }

  function toggleProfile(force) {
    if (!profileDropdown || !profileBtn) return;
    profileOpen = force !== undefined ? force : !profileOpen;
    profileDropdown.classList.toggle("invisible", !profileOpen);
    profileDropdown.classList.toggle("opacity-0", !profileOpen);
    profileDropdown.classList.toggle("scale-95", !profileOpen);
    profileBtn.setAttribute("aria-expanded", profileOpen);
    profileChevron?.classList.toggle("rotate-180", profileOpen);
    if (profileOpen) toggleNotif(false);
  }

  notifBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleNotif();
  });
  profileBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleProfile();
  });
  document.addEventListener("click", (e) => {
    if (notifOpen && notifDropdown && !notifDropdown.contains(e.target) && !notifBtn?.contains(e.target)) toggleNotif(false);
    if (profileOpen && profileDropdown && !profileDropdown.contains(e.target) && !profileBtn?.contains(e.target)) toggleProfile(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleNotif(false);
      toggleProfile(false);
    }
  });

  /* ============================================================
     ۶.۵) انیمیشن ورود ردیف‌های جدول
     ============================================================ */
  const rows = document.querySelectorAll(".order-row");
  rows.forEach((row, i) => {
    row.style.opacity = "0";
    row.style.transform = "translateY(12px)";
    row.style.transition = "opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)";
    setTimeout(() => {
      row.style.opacity = "1";
      row.style.transform = "translateY(0)";
    }, 700 + i * 110);
  });

  /* ============================================================
     ۷) پیکربندی سراسری Chart.js — فونت فارسی + راست‌چین
     ============================================================ */
  if (typeof Chart === "undefined") return;

  Chart.defaults.font.family = "'Vazirmatn FD', Tahoma, sans-serif";
  Chart.defaults.color = "#64748b";
  Chart.defaults.borderColor = "rgba(148, 163, 184, 0.08)";
  Chart.defaults.plugins.tooltip.rtl = true;
  Chart.defaults.plugins.tooltip.textDirection = "rtl";
  Chart.defaults.plugins.legend.rtl = true;
  Chart.defaults.plugins.legend.textDirection = "rtl";

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

  /* ============================================================
     ۸) نمودار درآمد — خطی با گرادیان
     ============================================================ */
  const revenueEl = document.getElementById("revenueChart");
  if (revenueEl) {
  const revenueCtx = revenueEl.getContext("2d");

  const gradientNow = revenueCtx.createLinearGradient(0, 0, 0, 320);
  gradientNow.addColorStop(0, "rgba(16, 185, 129, 0.35)");
  gradientNow.addColorStop(1, "rgba(16, 185, 129, 0)");

  const gradientPrev = revenueCtx.createLinearGradient(0, 0, 0, 320);
  gradientPrev.addColorStop(0, "rgba(100, 116, 139, 0.18)");
  gradientPrev.addColorStop(1, "rgba(100, 116, 139, 0)");

  registerChart(
    new Chart(revenueCtx, {
    type: "line",
    data: {
      labels: ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور"],
      datasets: [
        {
          label: "امسال (میلیون تومان)",
          data: [128, 165, 142, 198, 224, 284],
          borderColor: "#10b981",
          backgroundColor: gradientNow,
          fill: true,
          tension: 0.45,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#10b981",
          pointHoverBorderColor: "#fff",
          pointHoverBorderWidth: 2,
        },
        {
          label: "پارسال (میلیون تومان)",
          data: [95, 110, 102, 130, 148, 170],
          borderColor: "#475569",
          backgroundColor: gradientPrev,
          fill: true,
          tension: 0.45,
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#94a3b8",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: { duration: 1600, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${toFa(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 }, padding: 8 },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 11 },
            padding: 10,
            callback: (v) => toFa(v),
          },
          grid: { drawTicks: false },
          border: { display: false, dash: [4, 6] },
        },
      },
    },
    })
  );
  }

  /* ============================================================
     ۹) نمودار دایره‌ای منابع ترافیک
     ============================================================ */
  const trafficEl = document.getElementById("trafficChart");
  if (trafficEl) {
  registerChart(
    new Chart(trafficEl, {
    type: "doughnut",
    data: {
      labels: ["جستجوی گوگل", "شبکه‌های اجتماعی", "ایمیل مارکتینگ", "سایر"],
      datasets: [
        {
          data: [54, 24, 14, 8],
          backgroundColor: ["#34d399", "#22d3ee", "#f59e0b", "#64748b"],
          borderColor: "#0e1626",
          borderWidth: 5,
          hoverOffset: 10,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      animation: { animateRotate: true, duration: 1600, easing: "easeOutQuart" },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle,
          callbacks: { label: (ctx) => ` ${ctx.label}: ${toFa(ctx.parsed)}٪` },
        },
      },
    },
    })
  );
  }

  /* ============================================================
     ۱۰) اسپارک‌لاین‌های کارت‌های آماری
     ============================================================ */
  const sparkConfigs = [
    { id: "spark1", color: "#10b981", data: [12, 18, 14, 22, 19, 28, 24, 32, 29, 38] },
    { id: "spark2", color: "#22d3ee", data: [8, 12, 10, 16, 14, 20, 18, 24, 22, 27] },
    { id: "spark3", color: "#f59e0b", data: [20, 24, 19, 28, 25, 33, 30, 38, 35, 44] },
    { id: "spark4", color: "#fb7185", data: [30, 26, 28, 22, 25, 19, 21, 16, 18, 14] },
  ];

  sparkConfigs.forEach(({ id, color, data }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const ctx = el.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 60);
    grad.addColorStop(0, color + "55");
    grad.addColorStop(1, color + "00");

    registerChart(
      new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((_, i) => i),
        datasets: [
          {
            data,
            borderColor: color,
            backgroundColor: grad,
            fill: true,
            tension: 0.5,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1800, easing: "easeOutQuart", delay: 400 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
      })
    );
  });

})();
