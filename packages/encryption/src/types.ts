import { z } from "zod";

/**
 * Credential data shapes per (type, provider).
 * type = category, provider = specific service.
 */
export type CredentialData = {
  llm_credentials: {
    openai: { apiKey: string; organization?: string };
    anthropic: { apiKey: string };
    google: { apiKey: string; projectId?: string };
  };
  sandbox_credentials: {
    e2b: { apiKey: string };
  };
  storage_credentials: {
    aws_s3: {
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      sessionToken?: string;
    };
    cloudflare_r2: {
      endpoint: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
};

/** LLM credential payload for a given provider */
export type LLMCredentialPayload<T extends keyof CredentialData["llm_credentials"] = keyof CredentialData["llm_credentials"]> =
  CredentialData["llm_credentials"][T];

/** Storage credential payload for a given provider */
export type StorageCredentialPayload<T extends keyof CredentialData["storage_credentials"] = keyof CredentialData["storage_credentials"]> =
  CredentialData["storage_credentials"][T];

/** E2B sandbox credential payload */
export type SandboxCredentialPayload = CredentialData["sandbox_credentials"]["e2b"];

// ─── Zod schemas (single source of truth for type/provider) ─────────────────
export const CredentialTypeSchema = z.enum([
  "llm_credentials",
  "sandbox_credentials",
  "storage_credentials",
]);
export type CredentialType = z.infer<typeof CredentialTypeSchema>;

export const LLMProviderSchema = z.enum(["openai", "anthropic", "google"]);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

export const SandboxProviderSchema = z.enum(["e2b"]);
export type SandboxProvider = z.infer<typeof SandboxProviderSchema>;

export const StorageProviderSchema = z.enum(["aws_s3", "cloudflare_r2"]);
export type StorageProvider = z.infer<typeof StorageProviderSchema>;

export const CredentialProviderSchema = z.union([
  LLMProviderSchema,
  SandboxProviderSchema,
  StorageProviderSchema,
]);
export type CredentialProvider = z.infer<typeof CredentialProviderSchema>;

// ─── LLM credential payload schemas (for parsing API response) ──────────────
const LLMCredentialOpenaiSchema = z.looseObject({
  apiKey: z.string(),
  organization: z.string().optional(),
});

const LLMCredentialAnthropicSchema = z.looseObject({ apiKey: z.string() });

const LLMCredentialGoogleSchema = z.looseObject({
  apiKey: z.string(),
  projectId: z.string().optional(),
});

export type ParsedLLMCredential = {
  provider: LLMProvider;
  organization?: string;
  projectId?: string;
};

export function parseLLMCredentialData(
  provider: LLMProvider,
  data: unknown
): ParsedLLMCredential {
  const parsedProvider = LLMProviderSchema.parse(provider);
  if (parsedProvider === "openai") {
    const parsed = LLMCredentialOpenaiSchema.parse(data);
    return { provider: "openai", organization: parsed.organization, projectId: undefined };
  }
  if (parsedProvider === "google") {
    const parsed = LLMCredentialGoogleSchema.parse(data);
    return { provider: "google", organization: undefined, projectId: parsed.projectId };
  }
  return { provider: "anthropic", organization: undefined, projectId: undefined };
}

// ─── Storage credential payload schemas (for parsing API response) ───────────
const StorageCredentialAwsS3Schema = z.looseObject({
  accessKeyId: z.string(),
  region: z.string(),
  secretAccessKey: z.string().optional(),
  sessionToken: z.string().optional(),
});

const StorageCredentialCloudflareR2Schema = z.looseObject({
  accessKeyId: z.string(),
  endpoint: z.string(),
  secretAccessKey: z.string().optional(),
});

export type ParsedStorageCredential =
  | { provider: "aws_s3"; accessKeyId: string; region: string }
  | { provider: "cloudflare_r2"; accessKeyId: string; endpoint: string };

export function parseStorageCredentialData(
  provider: StorageProvider,
  data: unknown
): ParsedStorageCredential {
  const parsedProvider = StorageProviderSchema.parse(provider);
  if (parsedProvider === "aws_s3") {
    const parsed = StorageCredentialAwsS3Schema.parse(data);
    return { provider: "aws_s3", accessKeyId: parsed.accessKeyId, region: parsed.region };
  }
  const parsed = StorageCredentialCloudflareR2Schema.parse(data);
  return { provider: "cloudflare_r2", accessKeyId: parsed.accessKeyId, endpoint: parsed.endpoint };
}

// ─── Secret fields for masking ──────────────────────────────────────────────
export const CREDENTIAL_SECRET_FIELDS: Record<
  CredentialType,
  Partial<Record<string, string[]>>
> = {
  llm_credentials: {
    openai: ["apiKey"],
    anthropic: ["apiKey"],
    google: ["apiKey"],
  },
  sandbox_credentials: {
    e2b: ["apiKey"],
  },
  storage_credentials: {
    aws_s3: ["secretAccessKey", "sessionToken"],
    cloudflare_r2: ["secretAccessKey"],
  },
};
