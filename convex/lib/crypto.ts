/**
 * Convex Node-runtime mirror of `src/lib/integrations/crypto.ts`. Same
 * AES-256-GCM scheme, same `v1:<iv>:<ct>:<tag>` format, same key sourced
 * from `INTEGRATIONS_ENCRYPTION_KEY`.
 *
 * This file is used by Convex actions (which run in Node, so
 * `node:crypto` is available). Keep this in sync with the Next.js copy.
 */

"use node";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH_BYTES = 32;

function loadKey(): Buffer {
    const hex = process.env.INTEGRATIONS_ENCRYPTION_KEY;
    if (!hex) {
        throw new Error(
            "INTEGRATIONS_ENCRYPTION_KEY is not set in Convex env. Run `npx convex env set INTEGRATIONS_ENCRYPTION_KEY <hex>` to configure it.",
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
