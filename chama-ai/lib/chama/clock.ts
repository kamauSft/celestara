/** The seeded Umoja books stop on this day. A later calendar date still opens that picture. */
export const DEMO_BOOKS_AS_OF = "2026-10-16";

export function booksAsOf(now = new Date()): Date {
  const cap = new Date(`${DEMO_BOOKS_AS_OF}T00:00:00.000Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return today.getTime() > cap.getTime() ? cap : today;
}
