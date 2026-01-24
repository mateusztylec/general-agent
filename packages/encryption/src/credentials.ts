import crypto from "node:crypto";
import { z } from "zod";
import type { CredentialData } from "./types";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
function getKey(): Buffer {
  const rawKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY is required");
  }
  const key = Buffer.from(rawKey, "hex");
  if (key.length !== 32) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)."
    );
  }
  return key;
}

export function encryptString(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptString(encryptedPayload: string): string {
  if (!encryptedPayload || typeof encryptedPayload !== "string") {
    throw new Error("Invalid encrypted payload: must be a non-empty string");
  }

  const data = Buffer.from(encryptedPayload, "base64");
  const minLength = IV_LENGTH + AUTH_TAG_LENGTH + 1;

  if (data.length < minLength) {
    throw new Error(
      `Invalid encrypted payload: too short. Expected at least ${minLength} bytes, got ${data.length}`
    );
  }

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  return decrypted;
}

export function encryptJson<T>(value: T): string {
  return encryptString(JSON.stringify(value));
}

export function decryptJson<T>(
  encryptedPayload: string,
  validate?: (value: unknown) => value is T
): T {
  const parsed = JSON.parse(decryptString(encryptedPayload)) as unknown;
  if (validate && !validate(parsed)) {
    throw new Error("Decrypted payload failed validation");
  }
  return parsed as T;
}

const RecordSchema = z.record(z.string(), z.unknown());

/**
 * Encrypt credential data
 */
export function encryptCredentials(data: Record<string, unknown>): string {
  return encryptJson(data);
}

/**
 * Decrypt credential data
 */
export function decryptCredentials(
  encryptedData: string
): Record<string, unknown> {
  return decryptJson(encryptedData, (value): value is Record<string, unknown> =>
    RecordSchema.safeParse(value).success
  );
}

/**
 * Credential type schema (Zod)
 */
export const CredentialTypeSchema = z.enum([
  "openai_api_key",
  "anthropic_api_key",
  "s3_credentials",
  "r2_credentials",
  "aws_credentials",
  "custom",
]);

export type CredentialType = z.infer<typeof CredentialTypeSchema>;

/**
 * Type-safe credential creation
 */
export function createEncryptedCredential<T extends CredentialType>(
  _type: T,
  data: CredentialData[T]
): string {
  return encryptCredentials(data as Record<string, unknown>);
}

/**
 * Type-safe credential decryption
 */
export function getDecryptedCredential<T extends CredentialType>(
  _type: T,
  encryptedData: string
): CredentialData[T] {
  return decryptCredentials(encryptedData) as CredentialData[T];
}
