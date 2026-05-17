import { loadProducts } from "./products.js";

const grid = document.getElementById("product-grid");
const filtersEl = document.getElementById("filters");
const modal = document.getElementById("product-modal");
const modalContent = document.getElementById("modal-content");

let products = [];
let activeCategory = "All";

function formatPrice(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
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
    grid.innerHTML = `<p class="empty-state">The vault awaits your first wonder.<br><a href="admin.html">Open Curator Studio →</a></p>`;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (p, i) => `
    <article class="product-card" data-id="${p.id}" style="animation-delay:${i * 0.08}s">
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
          <span class="product-cta">View legend →</span>
        </div>
      </div>
    </article>`
    )
    .join("");

  grid.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => openModal(card.dataset.id));
  });
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
  const ctx = canvas.getContext("2d");
  let w, h, stars;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    stars = Array.from({ length: Math.floor(w * 0.08) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random(),
      speed: Math.random() * 0.3 + 0.05,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.a += s.speed * 0.01;
      const opacity = 0.3 + Math.sin(s.a) * 0.3;
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
  initStars();
  products = await loadProducts();
  const categories = [...new Set(products.map((p) => p.category))].sort();
  renderFilters(categories);
  renderGrid();
}

init();
