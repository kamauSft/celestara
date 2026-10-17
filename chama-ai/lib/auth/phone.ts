export { normalizePhone } from "../phone";

export function maskPhone(phone: string): string {
  if (phone.length < 8) return "hidden";
  return `${phone.slice(0, 7)}***${phone.slice(-3)}`;
}
