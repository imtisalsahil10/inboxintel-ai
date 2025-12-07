import { Buffer } from 'buffer';

export function decodeBodyFromGmail(data: string): string {
  // Gmail uses base64url. Convert to standard base64.
  const fixed = data.replace(/-/g, "+").replace(/_/g, "/");
  // pad length
  const pad = fixed.length % 4;
  const padded = pad ? fixed + "=".repeat(4 - pad) : fixed;
  try {
    return Buffer.from(padded, "base64").toString("utf8");
  } catch (err) {
    return "";
  }
}