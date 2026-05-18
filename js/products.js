const STORAGE_KEY = "silai-atelier-products";

const DEFAULT_PRODUCTS = [
  {
    id: "executive-suit-navy",
    name: "Executive Navy Bespoke Suit",
    description:
      "A sharply tailored bespoke suit crafted for modern elegance and confidence. Precision-cut with premium fabric for a flawless silhouette.",
    price: 18000,
    category: "Menswear",
    image:
      "https://images.unsplash.com/photo-1520975916090-3105956dac38?w=800&q=80",
  },
  {
    id: "evening-couture-gown",
    name: "Elegant Evening Couture Gown",
    description:
      "A flowing couture gown designed for grace and presence. Hand-finished detailing with a refined luxury aesthetic.",
    price: 15000,
    category: "Women’s Couture",
    image:
      "https://images.unsplash.com/photo-1520975682031-a6e0a6f3f0d5?w=800&q=80",
  },
  {
    id: "modern-african-suit",
    name: "Modern African Tailored Suit",
    description:
      "A fusion of contemporary tailoring and African-inspired elegance, designed to stand out with subtle sophistication.",
    price: 20000,
    category: "Menswear",
    image:
      "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=800&q=80",
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
  "Menswear",
  "Women’s Couture",
  "New Arrivals",
];
