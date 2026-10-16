const E164 = /^\+254[17]\d{8}$/;

/** Turn a Kenyan mobile number into E.164. Spaces, dashes, dots, and brackets are ignored. */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s().-]/g, "");
  let phone = compact;
  if (phone.startsWith("0") && phone.length === 10) phone = `+254${phone.slice(1)}`;
  else if (/^[17]\d{8}$/.test(phone)) phone = `+254${phone}`;
  else if (phone.startsWith("254") && phone.length === 12) phone = `+${phone}`;
  return E164.test(phone) ? phone : null;
}
