/**
 * RealAdapters — empty template for wiring host / production backends.
 * Replace // TODO bodies with calls into Neo / Nyumba Zetu services.
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

export function createRealAdapters(): {
  recordSale: RecordSalePort;
  searchListings: SearchListingsPort;
  confirmAction: ConfirmActionPort;
} {
  const recordSale: RecordSalePort = {
    async draftSale(_input: DraftSaleInput): Promise<DraftSaleResult> {
      // TODO: persist draft in Neo backend (do NOT write the sale yet)
      // TODO: return { requiresConfirmation: true, draftId, summary }
      throw new Error("RealAdapters.recordSale.draftSale not implemented");
    },

    async listSales(_userId?: string): Promise<Sale[]> {
      // TODO: fetch sales from Neo API / DB
      throw new Error("RealAdapters.recordSale.listSales not implemented");
    },
  };

  const searchListings: SearchListingsPort = {
    async search(_query: SearchListingsQuery): Promise<Listing[]> {
      // TODO: query Nyumba Zetu listings service
      throw new Error("RealAdapters.searchListings.search not implemented");
    },
  };

  const confirmAction: ConfirmActionPort = {
    async getDraft(_draftId: string): Promise<DraftAction | null> {
      // TODO: load draft by id from host store
      throw new Error("RealAdapters.confirmAction.getDraft not implemented");
    },

    async confirm(_draftId: string): Promise<ConfirmResult | ConfirmError> {
      // TODO: execute drafted action (e.g. commit sale) then mark confirmed
      throw new Error("RealAdapters.confirmAction.confirm not implemented");
    },
  };

  return { recordSale, searchListings, confirmAction };
}
