import {
  loadProducts,
  saveProducts,
  exportProductsJson,
  slugify,
  CATEGORIES,
} from "./products.js";

const form = document.getElementById("product-form");
const listEl = document.getElementById("product-list");
const categorySelect = document.getElementById("category");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const preview = document.getElementById("preview");
const imageUrl = document.getElementById("image-url");
const toast = document.getElementById("toast");

let products = [];
let currentImage = "";

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function initCategories() {
  categorySelect.innerHTML = CATEGORIES.map(
    (c) => `<option value="${c}">${c}</option>`
  ).join("");
}

function setPreview(src) {
  currentImage = src;
  if (src) {
    preview.src = src;
    preview.hidden = false;
  } else {
    preview.hidden = true;
    preview.removeAttribute("src");
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleFile(file) {
  if (!file?.type.startsWith("image/")) return;
  const dataUrl = await readFileAsDataUrl(file);
  setPreview(dataUrl);
  imageUrl.value = "";
}

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files?.[0];
  if (file) handleFile(file);
});

imageUrl.addEventListener("input", () => {
  const url = imageUrl.value.trim();
  if (url) setPreview(url);
});

function renderList() {
  if (!products.length) {
    listEl.innerHTML = "<p style='color:var(--text-muted)'>No treasures yet.</p>";
    return;
  }

  listEl.innerHTML = products
    .map(
      (p) => `
    <div class="product-list-item" data-id="${p.id}">
      <img src="${p.image}" alt="" />
      <div class="info">
        <h4>${p.name}</h4>
        <small>${p.category} · $${p.price}</small>
      </div>
      <button type="button" data-delete="${p.id}">Remove</button>
    </div>`
    )
    .join("");

  listEl.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      products = products.filter((p) => p.id !== btn.dataset.delete);
      saveProducts(products);
      renderList();
      showToast("Removed from vault");
    });
  });
}

function clearForm() {
  form.reset();
  setPreview("");
  currentImage = "";
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const description = document.getElementById("description").value.trim();
  const price = Number(document.getElementById("price").value);
  const category = categorySelect.value;
  const image = currentImage || imageUrl.value.trim();

  if (!image) {
    showToast("Please add an image");
    return;
  }

  let id = slugify(name);
  if (products.some((p) => p.id === id)) {
    id = `${id}-${Date.now()}`;
  }

  products.unshift({ id, name, description, price, category, image });
  saveProducts(products);
  renderList();
  clearForm();
  showToast(`“${name}” added to the vault ✦`);
});

document.getElementById("reset-form").addEventListener("click", clearForm);

document.getElementById("export-json").addEventListener("click", () => {
  exportProductsJson(products);
  showToast("Downloaded products.json");
});

document.getElementById("import-json").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported)) throw new Error("invalid");
    products = imported;
    saveProducts(products);
    renderList();
    showToast(`Imported ${imported.length} treasures`);
  } catch {
    showToast("Invalid JSON file");
  }
  e.target.value = "";
});

document.getElementById("reset-all").addEventListener("click", async () => {
  if (!confirm("Reset to the default sample collection?")) return;
  localStorage.removeItem("celestara-products");
  products = await loadProducts();
  renderList();
  showToast("Restored default wonders");
});

function initStars() {
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  let w, h, stars;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    stars = Array.from({ length: Math.floor(w * 0.06) }, () => ({
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
  initCategories();
  products = await loadProducts();
  renderList();
}

init();
