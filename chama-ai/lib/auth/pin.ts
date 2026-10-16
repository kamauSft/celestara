import { hash, verify } from "@node-rs/argon2";

const options = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  algorithm: 2 as const,
};

export function hashPin(pin: string): Promise<string> {
  return hash(pin, options);
}

export function verifyPin(pin: string, hashed: string): Promise<boolean> {
  return verify(hashed, pin, options);
}
