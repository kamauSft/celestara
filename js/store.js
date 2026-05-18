import { loadProducts } from "./products.js";

const grid = document.getElementById("product-grid");
const filtersEl = document.getElementById("filters");
const modal = document.getElementById("product-modal");
const modalContent = document.getElementById("modal-content");
const preloader = document.getElementById("preloader");
const cursorGlow = document.getElementById("cursor-glow");

let products = [];
let activeCategory = "All";

function formatPrice(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);
}

function initPreloader() {
  window.addEventListener("load", () => {
    setTimeout(() => preloader?.classList.add("done"), 600);
  });
  setTimeout(() => preloader?.classList.add("done"), 2500);
}

function initReveal() {
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  els.forEach((el) => io.observe(el));

  document.querySelectorAll(".hero .reveal").forEach((el) => {
    setTimeout(() => el.classList.add("visible"), 400);
  });
}

function initCursor() {
  if (!cursorGlow || window.matchMedia("(pointer: coarse)").matches) return;

  document.addEventListener("mousemove", (e) => {
    cursorGlow.style.left = `${e.clientX}px`;
    cursorGlow.style.top = `${e.clientY}px`;
  });
}

function renderFilters(categories) {
  const all = ["All", ...categories];

  filtersEl.innerHTML = all
    .map(
      (cat) =>
        `<button class="filter-btn${cat === activeCategory ? " active" : ""}" data-cat="${cat}">${cat}</button>`
    )
    .join("");

  filtersEl.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderFilters(categories);
      renderGrid();
    });
  });
}

function renderGrid() {
  const filtered =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  if (!filtered.length) {
    grid.innerHTML = `
      <p class="empty-state reveal visible">
        No designs available yet.<br>
        <a href="admin.html">Open Curator Studio →</a>
      </p>`;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (p, i) => `
    <article class="product-card reveal" data-id="${p.id}" style="animation-delay:${i * 0.08}s">
      <div class="product-image-wrap">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
        <span class="product-badge">${p.category}</span>
      </div>

      <div class="product-body">
        <p class="product-category">${p.category}</p>
        <h3>${p.name}</h3>
        <p>${p.description}</p>

        <div class="product-footer">
          <span class="product-price">${formatPrice(p.price)}</span>
          <span class="product-cta">View design →</span>
        </div>
      </div>
    </article>`
    )
    .join("");

  grid.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => openModal(card.dataset.id));
  });

  const cards = grid.querySelectorAll(".product-card.reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  cards.forEach((c) => io.observe(c));
}

function openModal(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;

  modalContent.innerHTML = `
    <img src="${p.image}" alt="${p.name}" />
    <div class="modal-info">
      <p class="product-category">${p.category}</p>
      <h2>${p.name}</h2>
      <p class="product-price">${formatPrice(p.price)}</p>
      <p>${p.description}</p>
    </div>`;

  modal.showModal();
}

modal.querySelector(".modal-close").addEventListener("click", () => modal.close());

modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.close();
});

function initStars() {
  const canvas = document.getElementById("stars");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let w, h, stars;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;

    stars = Array.from({ length: Math.floor(w * 0.12) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.15,
      a: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.005,
      drift: (Math.random() - 0.5) * 0.15,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    for (const s of stars) {
      s.a += s.speed;
      s.x += s.drift;

      if (s.x < 0) s.x = w;
      if (s.x > w) s.x = 0;

      const opacity = 0.25 + Math.sin(s.a) * 0.35;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 175, 55, ${opacity})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  draw();
}

async function init() {
  initPreloader();
  initCursor();
  initStars();
  initReveal();

  products = await loadProducts();

  const categories = [...new Set(products.map((p) => p.category))].sort();

  renderFilters(categories);
  renderGrid();
}

init();
