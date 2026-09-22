/**
 * Nyumba tool: search_listings — location / filters → matches immediately.
 */

import type { AgentToolDefinition } from "../../contract.js";

export const searchListingsTool: AgentToolDefinition = {
  name: "search_listings",
  description:
    "Search Nyumba Zetu property/land listings by location, optional bedrooms, maxPrice, and nearby landmark. Returns matches immediately.",
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "Area or town, e.g. Westlands, Kitengela, Ruiru",
      },
      bedrooms: {
        type: "number",
        description: "Minimum bedrooms (omit for land/commercial)",
      },
      maxPrice: {
        type: "number",
        description: "Maximum price in listing currency (KES)",
      },
      nearby: {
        type: "string",
        description: "Nearby landmark or road filter",
      },
    },
    required: ["location"],
  },
  async execute(input, ctx) {
    const location = String(input.location ?? "");
    if (!location) return { error: "location is required" };

    const bedrooms =
      input.bedrooms != null ? Number(input.bedrooms) : undefined;
    const maxPrice =
      input.maxPrice != null ? Number(input.maxPrice) : undefined;
    const nearby =
      input.nearby != null ? String(input.nearby) : undefined;

    const listings = await ctx.deps.searchListings.search({
      location,
      bedrooms: Number.isFinite(bedrooms) ? bedrooms : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      nearby,
    });

    return { count: listings.length, listings };
  },
};
