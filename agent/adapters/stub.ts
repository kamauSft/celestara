/**
 * StubAdapters — in-memory defaults seeded with sample Neo sales + Nyumba listings.
 * Used by the standalone dev runner. Persistence uses agent_ prefixes in memory only.
 */

import type {
  ConfirmActionPort,
  ConfirmError,
  ConfirmResult,
  DraftAction,
  DraftSaleInput,
  DraftSaleResult,
  Listing,
  RecordSalePort,
  Sale,
  SearchListingsPort,
  SearchListingsQuery,
} from "../contract.js";

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const agent_sales: Sale[] = [
  {
    id: "agent_sale_seed_1",
    item: "bags cement",
    quantity: 5,
    customer: "James Otieno",
    amount: 4500,
    currency: "KES",
    createdAt: "2026-09-01T10:00:00.000Z",
    userId: "demo-user",
  },
  {
    id: "agent_sale_seed_2",
    item: "paint buckets",
    quantity: 2,
    customer: "Amina Hassan",
    amount: 3200,
    currency: "KES",
    createdAt: "2026-09-10T14:30:00.000Z",
    userId: "demo-user",
  },
];

const agent_listings: Listing[] = [
  {
    id: "agent_listing_1",
    title: "2BR apartment near Westlands",
    location: "Westlands, Nairobi",
    bedrooms: 2,
    price: 85000,
    currency: "KES",
    nearby: ["Sarit Centre", "Waiyaki Way"],
    type: "apartment",
    description: "Bright unit with balcony; close to shopping and transit.",
  },
  {
    id: "agent_listing_2",
    title: "3BR house in Kitengela",
    location: "Kitengela, Kajiado",
    bedrooms: 3,
    price: 6500000,
    currency: "KES",
    nearby: ["EPZ", "Namanga Road"],
    type: "house",
    description: "Family home with compound; title deed available.",
  },
  {
    id: "agent_listing_3",
    title: "1/8 acre plot — Ruiru",
    location: "Ruiru, Kiambu",
    price: 2800000,
    currency: "KES",
    nearby: ["Thika Superhighway", "Ruiru Town"],
    type: "land",
    description: "Serviced plot suitable for residential build.",
  },
  {
    id: "agent_listing_4",
    title: "Studio in Kilimani",
    location: "Kilimani, Nairobi",
    bedrooms: 1,
    price: 45000,
    currency: "KES",
    nearby: ["Yaya Centre", "Argwings Kodhek"],
    type: "apartment",
    description: "Furnished studio for professionals.",
  },
  {
    id: "agent_listing_5",
    title: "Shop space — Gikomba",
    location: "Gikomba, Nairobi",
    price: 120000,
    currency: "KES",
    nearby: ["Gikomba Market"],
    type: "commercial",
    description: "Ground-floor retail frontage.",
  },
];

const agent_drafts = new Map<string, DraftAction>();

export function createStubAdapters(): {
  recordSale: RecordSalePort;
  searchListings: SearchListingsPort;
  confirmAction: ConfirmActionPort;
} {
  const recordSale: RecordSalePort = {
    async draftSale(input: DraftSaleInput): Promise<DraftSaleResult> {
      const draftId = id("agent_draft");
      const currency = input.currency ?? "KES";
      const summary = `Record sale: ${input.quantity} × ${input.item} to ${input.customer} for ${currency} ${input.amount}`;
      const draft: DraftAction = {
        id: draftId,
        tool: "record_sale",
        summary,
        payload: { ...input, currency },
        requiresConfirmation: true,
        createdAt: new Date().toISOString(),
        userId: input.userId,
        product: "neo",
        status: "pending",
      };
      agent_drafts.set(draftId, draft);
      return { requiresConfirmation: true, draftId, summary };
    },

    async listSales(userId?: string): Promise<Sale[]> {
      if (!userId) return [...agent_sales];
      return agent_sales.filter((s) => s.userId === userId);
    },
  };

  const searchListings: SearchListingsPort = {
    async search(query: SearchListingsQuery): Promise<Listing[]> {
      const loc = query.location.toLowerCase();
      const nearby = query.nearby?.toLowerCase();
      return agent_listings.filter((listing) => {
        const locOk =
          listing.location.toLowerCase().includes(loc) ||
          listing.title.toLowerCase().includes(loc);
        if (!locOk && loc.length > 0) {
          // still allow nearby-only if location loosely matches nearby tags
          const nearHit = listing.nearby?.some((n) =>
            n.toLowerCase().includes(loc),
          );
          if (!nearHit) return false;
        }
        if (
          query.bedrooms != null &&
          listing.bedrooms != null &&
          listing.bedrooms < query.bedrooms
        ) {
          return false;
        }
        if (query.maxPrice != null && listing.price > query.maxPrice) {
          return false;
        }
        if (nearby) {
          const hit = listing.nearby?.some((n) =>
            n.toLowerCase().includes(nearby),
          );
          if (!hit) return false;
        }
        return true;
      });
    },
  };

  const confirmAction: ConfirmActionPort = {
    async getDraft(draftId: string): Promise<DraftAction | null> {
      return agent_drafts.get(draftId) ?? null;
    },

    async confirm(draftId: string): Promise<ConfirmResult | ConfirmError> {
      const draft = agent_drafts.get(draftId);
      if (!draft) return { ok: false, error: `Draft not found: ${draftId}` };
      if (draft.status !== "pending") {
        return { ok: false, error: `Draft is already ${draft.status}` };
      }

      if (draft.tool === "record_sale") {
        const p = draft.payload as DraftSaleInput & { currency: string };
        const sale: Sale = {
          id: id("agent_sale"),
          item: p.item,
          quantity: p.quantity,
          customer: p.customer,
          amount: p.amount,
          currency: p.currency,
          createdAt: new Date().toISOString(),
          userId: p.userId,
        };
        agent_sales.push(sale);
        draft.status = "confirmed";
        agent_drafts.set(draftId, draft);
        return { ok: true, result: sale };
      }

      return { ok: false, error: `Unknown draft tool: ${draft.tool}` };
    },
  };

  return { recordSale, searchListings, confirmAction };
}

/** Reset in-memory stores (tests / demos). */
export function resetStubState(): void {
  agent_sales.splice(
    0,
    agent_sales.length,
    {
      id: "agent_sale_seed_1",
      item: "bags cement",
      quantity: 5,
      customer: "James Otieno",
      amount: 4500,
      currency: "KES",
      createdAt: "2026-09-01T10:00:00.000Z",
      userId: "demo-user",
    },
    {
      id: "agent_sale_seed_2",
      item: "paint buckets",
      quantity: 2,
      customer: "Amina Hassan",
      amount: 3200,
      currency: "KES",
      createdAt: "2026-09-10T14:30:00.000Z",
      userId: "demo-user",
    },
  );
  agent_drafts.clear();
}
