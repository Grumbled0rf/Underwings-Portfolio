import { randomBytes } from 'node:crypto';

export function generateToken(): string {
  return randomBytes(24).toString('base64url');
}

export function expiryDate(days = 30): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
