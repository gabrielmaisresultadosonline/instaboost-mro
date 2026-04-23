const encoder = new TextEncoder();

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function createAdminSessionToken(payload: { email: string; scope?: string; exp: number }, secret: string) {
  const serialized = JSON.stringify({ ...payload, scope: payload.scope ?? "renda-extra-v2-admin" });
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(serialized));
  return `${toBase64Url(encoder.encode(serialized))}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyAdminSessionToken(token: string | null | undefined, secret: string) {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const payloadBytes = fromBase64Url(parts[0]);
    const signatureBytes = fromBase64Url(parts[1]);
    const key = await importHmacKey(secret);
    const verified = await crypto.subtle.verify("HMAC", key, signatureBytes, payloadBytes);
    if (!verified) return null;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      email?: string;
      scope?: string;
      exp?: number;
    };

    if (!payload.email || payload.scope !== "renda-extra-v2-admin" || !payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
}
