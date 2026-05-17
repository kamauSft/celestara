const STORAGE_KEY = "celestara-products";

const DEFAULT_PRODUCTS = [
  {
    id: "aurora-vial",
    name: "Bottled Aurora — No. VII",
    description:
      "A hand-captured slice of northern lights, sealed in Venetian glass. Swirl gently before opening at midnight.",
    price: 2847,
    category: "Elixirs",
    image:
      "https://images.unsplash.com/photo-1536431311719-398b6704d4cc?w=800&q=80",
  },
  {
    id: "moon-thread-scarf",
    name: "Moon-Thread Scarf",
    description:
      "Woven from threads that only exist during the waning crescent. Warms the wearer with memories of summers they never had.",
    price: 890,
    category: "Vestments",
    image:
      "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&q=80",
  },
  {
    id: "tomorrow-clock",
    name: "Clock That Remembers Tomorrow",
    description:
      "Its hands move counterclockwise on Tuesdays. Runs on intention — batteries not included.",
    price: 4200,
    category: "Artifacts",
    image:
      "https://images.unsplash.com/photo-1563861826100-9cb518e86ea7?w=800&q=80",
  },
];

export async function loadProducts() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      /* fall through */
    }
  }

  try {
    const res = await fetch("./data/products.json");
    if (!res.ok) throw new Error("fetch failed");
    const products = await res.json();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return products;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
}

export function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function exportProductsJson(products) {
  const blob = new Blob([JSON.stringify(products, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "products.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export const CATEGORIES = [
  "Elixirs",
  "Vestments",
  "Artifacts",
  "Adornments",
  "Curios",
];
