import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it("accepts the Kenyan formats a treasurer might type", () => {
    const expected = "+254712345005";
    expect(normalizePhone("0712345005")).toBe(expected);
    expect(normalizePhone("712345005")).toBe(expected);
    expect(normalizePhone("254712345005")).toBe(expected);
    expect(normalizePhone("+254712345005")).toBe(expected);
    expect(normalizePhone("+254 712 345 005")).toBe(expected);
    expect(normalizePhone("0712-345-005")).toBe(expected);
    expect(normalizePhone("(0712) 345 005")).toBe(expected);
    expect(normalizePhone("+254.712.345.005")).toBe(expected);
    expect(normalizePhone("0112345678")).toBe("+254112345678");
    expect(normalizePhone("112345678")).toBe("+254112345678");
  });

  it("rejects numbers that are not a Safaricom or Airtel mobile", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("nope")).toBeNull();
    expect(normalizePhone("0212345678")).toBeNull();
    expect(normalizePhone("+254012345678")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});
