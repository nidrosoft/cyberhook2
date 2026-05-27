/**
 * AES-256-GCM token encryption for stored OAuth credentials.
 *
 * The same algorithm is mirrored in `convex/lib/crypto.ts` so Convex Node
 * actions can decrypt for token refresh / outbound API calls. Both
 * modules read the symmetric key from `INTEGRATIONS_ENCRYPTION_KEY`
 * (32-byte hex string — generate with `openssl rand -hex 32`).
 *
 * Ciphertext format: `v1:<base64(iv)>:<base64(ciphertext)>:<base64(authTag)>`
 *
 * The `v1` prefix lets us rotate keys / change algorithms later without
 * having to migrate every row at once.
 *
 * SECURITY NOTES
 * - IV is random per encryption (12 bytes for GCM).
 * - We use `auth tag` mode so any tampering invalidates the decrypt.
 * - The key MUST stay out of source control. In production, prefer a
 *   secrets manager (e.g. Vercel encrypted env vars). For local dev,
 *   set `INTEGRATIONS_ENCRYPTION_KEY` in `.env.local`.
 *
 * NEVER LOG decrypted tokens. NEVER return them in client-visible API
 * responses. They flow only between Next.js server routes / Convex Node
 * actions ↔ the external OAuth provider.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — GCM recommended
const KEY_LENGTH_BYTES = 32; // 256 bits

function loadKey(): Buffer {
    const hex = process.env.INTEGRATIONS_ENCRYPTION_KEY;
    if (!hex) {
        throw new Error(
            "INTEGRATIONS_ENCRYPTION_KEY is not set. Generate a 32-byte key with `openssl rand -hex 32` and add it to your env.",
        );
    }
    const buf = Buffer.from(hex, "hex");
    if (buf.length !== KEY_LENGTH_BYTES) {
        throw new Error(
            `INTEGRATIONS_ENCRYPTION_KEY must be a 32-byte hex string (got ${buf.length} bytes).`,
        );
    }
    return buf;
}

export function encryptToken(plaintext: string): string {
    const key = loadKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `v1:${iv.toString("base64")}:${ciphertext.toString("base64")}:${authTag.toString("base64")}`;
}

export function decryptToken(blob: string): string {
    const parts = blob.split(":");
    if (parts.length !== 4 || parts[0] !== "v1") {
        throw new Error("Invalid encrypted token format");
    }
    const iv = Buffer.from(parts[1], "base64");
    const ciphertext = Buffer.from(parts[2], "base64");
    const authTag = Buffer.from(parts[3], "base64");

    const key = loadKey();
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
}
