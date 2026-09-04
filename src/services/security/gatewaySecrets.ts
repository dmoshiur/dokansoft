import crypto from "crypto";

/**
 * Lightweight AES-256-GCM encryption for gateway credentials stored in the
 * `gateway_configs` collection. The key is derived from JWT_SECRET (or a
 * hardcoded dev fallback); production deployments must set JWT_SECRET.
 *
 * The `enc:v1:iv:tag:data` prefix lets us recognize encrypted values while
 * remaining backward compatible with previously stored plaintext values.
 */
const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function deriveKey(): Buffer {
  const secret = process.env.JWT_SECRET || "super_secure_jwt_key_2026";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string | undefined | null): string {
  if (!value) return value || "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(value: string | undefined | null): string {
  if (!value) return value || "";
  if (!value.startsWith(PREFIX)) return value;
  try {
    const [, , ivB64, tagB64, dataB64] = value.split(":");
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      deriveKey(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.warn("[GatewaySecrets] Failed to decrypt secret; returning raw value.", err);
    return value;
  }
}
