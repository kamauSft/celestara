/**
 * knowledge.ts — static product fact-sheet for Codzure Solutions.
 * SOURCE_URL is documentation-only; never fetched at runtime.
 * Keep knowledge fully separate from tool implementations.
 */

export const SOURCE_URL = "https://codzure-solutions.vercel.app/";

export const STUDIO_BLURB =
  "Codzure Solutions is the studio behind Neo (NeoBuk) and Nyumba Zetu (Ask Nyumbani).";

const NEO_FACTS = [
  "Neo (also NeoBuk) is an SME workspace for small businesses.",
  "Core domains: sales logging, expenses, inventory, and day-to-day ops.",
  "Users speak naturally (e.g. \"sold 3 bags cement to Mary 1500\"); Neo drafts structured sales.",
  "Writes always require explicit confirmation before persistence.",
  "Currency defaults to KES unless the user specifies otherwise.",
].join(" ");

const NYUMBA_FACTS = [
  "Nyumba Zetu (Ask Nyumbani) helps people discover property and land.",
  "Supports location search, bedroom/price filters, and nearby landmarks.",
  "Guidance includes title-deed checklist awareness and a resale marketplace lens.",
  "Search results come from listing data; present matches clearly with location and price.",
  "Currency defaults to KES unless otherwise noted.",
].join(" ");

export function getFactSheet(product: "neo" | "nyumba"): string {
  const productSheet = product === "neo" ? NEO_FACTS : NYUMBA_FACTS;
  return [
    STUDIO_BLURB,
    `Canonical product site (reference only, not fetched): ${SOURCE_URL}`,
    productSheet,
  ].join("\n");
}

export function buildSystemPrompt(product: "neo" | "nyumba"): string {
  const name = product === "neo" ? "Neo (NeoBuk)" : "Nyumba Zetu (Ask Nyumbani)";
  return [
    `You are the ${name} assistant for Codzure Solutions.`,
    "Be concise, helpful, and action-oriented.",
    "Use only the tools provided for this product.",
    "For write operations: draft first, summarize, and ask the user to confirm. Never invent confirmation.",
    "When a draft is returned with requiresConfirmation, show the summary and ask the user to confirm (they can say \"confirm\" / provide the draft id).",
    "For search/read tools, run immediately and present results clearly.",
    "",
    "PRODUCT FACTS:",
    getFactSheet(product),
  ].join("\n");
}
