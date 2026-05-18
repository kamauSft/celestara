import { loadProducts, saveProducts, exportProductsJson } from "./products.js";

const form = document.getElementById("product-form");
const list = document.getElementById("product-list");
const toast = document.getElementById("toast");

const nameInput = document.getElementById("name");
const descInput = document.getElementById("description");
const priceInput = document.getElementById("price");
const categoryInput = document.getElementById("category");
const imageUrlInput = document.getElementById("image-url");
const fileInput = document.getElementById("file-input");
const preview = document.getElementById("preview");

let products = [];
let editingId = null;

/* ------------------ INIT ------------------ */
async function init() {
  products = await loadProducts();
  render();
}

init();

/* ------------------ RENDER ------------------ */
function render() {
  list.innerHTML = products
    .map(
      (p) => `
      <div class="admin-card">
        <img src="${p.image}" alt="${p.name}" />

        <div class="admin-card-body">
          <h3>${p.name}</h3>
          <p>${p.category}</p>
          <p>KES ${p.price}</p>

          <div class="admin-card-actions">
            <button onclick="editProduct('${p.id}')">Edit</button>
            <button onclick="deleteProduct('${p.id}')">Delete</button>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

/* ------------------ SUBMIT ------------------ */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const product = {
    id: editingId || crypto.randomUUID(),
    name: nameInput.value,
    description: descInput.value,
    price: Number(priceInput.value),
    category: categoryInput.value,
    image: imageUrlInput.value || preview.src || "",
  };

  if (editingId) {
    products = products.map((p) => (p.id === editingId ? product : p));
    showToast("Design updated successfully ✨");
  } else {
    products.push(product);
    showToast("Design added to collection ✨");
  }

  saveProducts(products);
  resetForm();
  render();
});

/* ------------------ EDIT ------------------ */
window.editProduct = (id) => {
  const product = products.find((p) => p.id === id);
  if (!product) return;

  editingId = id;

  nameInput.value = product.name;
  descInput.value = product.description;
  priceInput.value = product.price;
  categoryInput.value = product.category;
  imageUrlInput.value = product.image;

  preview.src = product.image;
  preview.hidden = false;

  showToast("Editing mode enabled 🛠️");
};

/* ------------------ DELETE ------------------ */
window.deleteProduct = (id) => {
  products = products.filter((p) => p.id !== id);
  saveProducts(products);
  render();
  showToast("Design removed ❌");
};

/* ------------------ RESET FORM ------------------ */
function resetForm() {
  editingId = null;
  form.reset();
  preview.hidden = true;
  preview.src = "";
}

/* ------------------ IMAGE UPLOAD ------------------ */
imageUrlInput.addEventListener("input", () => {
  preview.src = imageUrlInput.value;
  preview.hidden = false;
});

/* ------------------ TOAST ------------------ */
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

/* ------------------ EXPORT ------------------ */
document
  .getElementById("export-json")
  .addEventListener("click", () => {
    exportProductsJson(products);
    showToast("Catalog exported 📦");
  });

/* ------------------ IMPORT ------------------ */
document
  .getElementById("import-json")
  .addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      products = JSON.parse(event.target.result);
      saveProducts(products);
      render();
      showToast("Catalog imported 📥");
    };

    reader.readAsText(file);
  });

/* ------------------ RESET ALL ------------------ */
document.getElementById("reset-all").addEventListener("click", () => {
  if (confirm("Reset entire collection?")) {
    products = [];
    saveProducts(products);
    render();
    showToast("Collection reset 🗑️");
  }
});
