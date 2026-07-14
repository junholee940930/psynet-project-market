import { createHash } from "node:crypto";

export const ADMIN_COOKIE = "pm_admin";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function adminPasswordConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return !!expected && input === expected;
}

export function computeAdminToken(): string | null {
  const expected = process.env.ADMIN_PASSWORD;
  return expected ? hash(expected) : null;
}

export function isValidAdminToken(token: string | undefined): boolean {
  const expected = computeAdminToken();
  return !!expected && token === expected;
}
