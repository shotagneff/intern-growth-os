import { ROLES, type Role } from "./roles";

const textEncoder = new TextEncoder();

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  const b64 =
    typeof btoa === "function"
      ? btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeString(s: string): string {
  return base64UrlEncodeBytes(textEncoder.encode(s));
}

function base64UrlDecodeToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, textEncoder.encode(data));
  return new Uint8Array(sig);
}

export type AdminTokenPayload = {
  role: "admin";
  exp: number;
};

export type SessionTokenPayload = {
  role: Role;
  loginId?: string;
  exp: number;
};

export async function signAdminToken(payload: AdminTokenPayload, secret: string): Promise<string> {
  const body = base64UrlEncodeString(JSON.stringify(payload));
  const sig = base64UrlEncodeBytes(await hmacSha256(secret, body));
  return `${body}.${sig}`;
}

export async function verifyAdminToken(token: string, secret: string): Promise<AdminTokenPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = base64UrlEncodeBytes(await hmacSha256(secret, body));
  if (expectedSig !== sig) return null;

  try {
    const payloadRaw = new TextDecoder().decode(base64UrlDecodeToBytes(body));
    const payload = JSON.parse(payloadRaw) as AdminTokenPayload;
    if (payload.role !== "admin") return null;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function signSessionToken(payload: SessionTokenPayload, secret: string): Promise<string> {
  const body = base64UrlEncodeString(JSON.stringify(payload));
  const sig = base64UrlEncodeBytes(await hmacSha256(secret, body));
  return `${body}.${sig}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionTokenPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = base64UrlEncodeBytes(await hmacSha256(secret, body));
  if (expectedSig !== sig) return null;

  try {
    const payloadRaw = new TextDecoder().decode(base64UrlDecodeToBytes(body));
    const payload = JSON.parse(payloadRaw) as SessionTokenPayload;
    if (!ROLES.includes(payload.role)) return null;
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
