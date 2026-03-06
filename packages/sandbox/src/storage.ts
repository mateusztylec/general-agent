import type { StorageConfig } from "@general-agent/agent/config-types";
import type { Sandbox } from "e2b";

export type DecryptedCredential = {
  type: string;
  provider: string;
  data: Record<string, unknown>;
};

export type MountResult = {
  success: boolean;
  storageType: string;
  bucketName: string;
  mountPath: string;
  error?: string;
};

export type MountStorageOptions = {
  sandbox: Sandbox;
  storageConfigs: StorageConfig[];
  getCredential: (id: string) => Promise<DecryptedCredential>;
};

type SandboxCommandResult = Awaited<ReturnType<Sandbox["commands"]["run"]>>;

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  if (!trimmed) return trimmed;

  // Accept both "account.r2.cloudflarestorage.com" and "https://account.r2.cloudflarestorage.com"
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      return `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, "");
    } catch {
      return trimmed.replace(/^https?:\/\//, "");
    }
  }

  return trimmed;
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function toDetailedErrorMessage(error: unknown): string {
  const base = toErrorMessage(error);
  if (!error || typeof error !== "object") return base;

  const maybeError = error as {
    exitCode?: number;
    stderr?: string;
    stdout?: string;
  };

  const details: string[] = [];
  if (typeof maybeError.exitCode === "number") {
    details.push(`exit=${maybeError.exitCode}`);
  }
  if (typeof maybeError.stderr === "string" && maybeError.stderr.trim()) {
    details.push(`stderr=${maybeError.stderr.trim()}`);
  }
  if (typeof maybeError.stdout === "string" && maybeError.stdout.trim()) {
    details.push(`stdout=${maybeError.stdout.trim()}`);
  }

  if (details.length === 0) return base;
  return `${base} (${details.join(", ")})`;
}

function resolveMountPath(bucketName: string, requestedMountPath?: string): string {
  const path = requestedMountPath?.trim();
  if (!path) return `/home/user/${bucketName}`;

  // Keep relative paths inside /home/user.
  if (!path.startsWith("/")) return `/home/user/${path}`;

  // Absolute paths should be respected as provided in config.
  return path;
}

/**
 * Mount all configured storage buckets to the sandbox
 */
export async function mountAllStorage(
  options: MountStorageOptions,
): Promise<MountResult[]> {
  const { sandbox, storageConfigs, getCredential } = options;
  const results: MountResult[] = [];

  if (!storageConfigs || storageConfigs.length === 0) {
    console.log("[Storage] No storage configurations to mount");
    return results;
  }

  console.log(`[Storage] Mounting ${storageConfigs.length} storage(s)...`);

  for (const storageConfig of storageConfigs) {
    try {
      // Skip if no credential ID
      if (!storageConfig.credentialId) {
        console.warn(
          "[Storage] Skipping storage without credentialId:",
          storageConfig,
        );
        results.push({
          success: false,
          storageType: storageConfig.type,
          bucketName: storageConfig.config?.bucketName || "unknown",
          mountPath: storageConfig.config?.mountPath || "unknown",
          error: "No credential ID provided",
        });
        continue;
      }

      // Fetch credential
      const credential = await getCredential(storageConfig.credentialId);

      const result = await mountBucketWithS3fs(sandbox, storageConfig, credential);

      results.push(result);

      if (result.success) {
        console.log(
          `[Storage] Successfully mounted ${result.storageType} bucket: ${result.bucketName} at ${result.mountPath}`,
        );
      } else {
        console.error(
          `[Storage] Failed to mount ${result.storageType} bucket: ${result.bucketName}`,
          result.error,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("[Storage] Error mounting storage:", errorMessage);
      results.push({
        success: false,
        storageType: storageConfig.type,
        bucketName: storageConfig.config?.bucketName || "unknown",
        mountPath: storageConfig.config?.mountPath || "unknown",
        error: errorMessage,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `[Storage] Mounted ${successCount}/${results.length} storage(s) successfully`,
  );

  return results;
}

/**
 * Mount S3-compatible bucket (S3 or R2) using s3fs.
 * R2 additionally requires the use_path_request_style flag.
 */
async function mountBucketWithS3fs(
  sandbox: Sandbox,
  storageConfig: StorageConfig,
  credential: DecryptedCredential,
): Promise<MountResult> {
  const storageType = storageConfig.type;
  const config = storageConfig.config;

  if (!config) {
    return {
      success: false,
      storageType,
      bucketName: "unknown",
      mountPath: "unknown",
      error: "Missing storage config details",
    };
  }

  const { bucketName, mountPath, accessMode } = config;
  const credData = credential.data as Record<string, unknown>;
  const provider = credential.provider;

  if (!credData.accessKeyId || !credData.secretAccessKey) {
    return {
      success: false,
      storageType,
      bucketName,
      mountPath,
      error: `Missing storage credentials (accessKeyId or secretAccessKey)`,
    };
  }

  // Resolve endpoint: cloudflare_r2 has endpoint, aws_s3 derives from region
  let endpoint: string;
  if (provider === "cloudflare_r2" && typeof credData.endpoint === "string") {
    endpoint = normalizeEndpoint(credData.endpoint);
  } else if (provider === "aws_s3" && typeof credData.region === "string") {
    endpoint = `s3.${credData.region}.amazonaws.com`;
  } else {
    return {
      success: false,
      storageType,
      bucketName,
      mountPath,
      error: `Invalid storage credential: missing endpoint (cloudflare_r2) or region (aws_s3)`,
    };
  }

  try {
    const finalMountPath = resolveMountPath(bucketName, mountPath);

    try {
      await sandbox.commands.run(`sudo mkdir -p ${shellEscape(finalMountPath)}`);
    } catch (error) {
      return {
        success: false,
        storageType,
        bucketName,
        mountPath: finalMountPath,
        error: `Failed to create mount directory "${finalMountPath}": ${toDetailedErrorMessage(error)}`,
      };
    }

    // Write credentials file without shell interpolation (safer for special characters)
    const credFile = "/home/user/.passwd-s3fs";
    const credContent = `${String(credData.accessKeyId)}:${String(credData.secretAccessKey)}`;
    try {
      await sandbox.files.write(credFile, credContent);
      await sandbox.commands.run(`chmod 600 ${shellEscape(credFile)}`);
    } catch (error) {
      return {
        success: false,
        storageType,
        bucketName,
        mountPath: finalMountPath,
        error: `Failed to prepare credential file "${credFile}": ${toDetailedErrorMessage(error)}`,
      };
    }

    const flags = [
      `-o url=https://${endpoint}`,
      `-o passwd_file=${shellEscape(credFile)}`,
      "-o allow_other",
      // R2 requires path-style requests; AWS S3 uses virtual-hosted style by default
      ...(provider === "cloudflare_r2" ? ["-o use_path_request_style"] : []),
      "-o dbglevel=debug",
    ];

    if (accessMode === "readonly") {
      flags.push("-o ro");
    }

    const mountCmd = `sudo s3fs ${flags.join(" ")} ${shellEscape(bucketName)} ${shellEscape(finalMountPath)}`;
    console.log(`[Storage] ${storageType.toUpperCase()} mount command: ${mountCmd}`);

    try {
      const s3fsCheck = await sandbox.commands.run("which s3fs");
      console.log(
        `[Storage] s3fs binary: ${s3fsCheck.stdout.trim() || "NOT FOUND"} (exit: ${s3fsCheck.exitCode})`,
      );
    } catch (error) {
      return {
        success: false,
        storageType,
        bucketName,
        mountPath: finalMountPath,
        error: `Failed to check s3fs binary: ${toDetailedErrorMessage(error)}`,
      };
    }

    let mountResult: SandboxCommandResult;
    try {
      mountResult = await sandbox.commands.run(mountCmd);
    } catch (error) {
      return {
        success: false,
        storageType,
        bucketName,
        mountPath: finalMountPath,
        error: `Mount command threw before completion: ${toDetailedErrorMessage(error)}`,
      };
    }

    console.log(`[Storage] ${storageType.toUpperCase()} mount exit code: ${mountResult.exitCode}`);
    console.log(`[Storage] ${storageType.toUpperCase()} mount stdout: ${mountResult.stdout || "(empty)"}`);
    console.log(`[Storage] ${storageType.toUpperCase()} mount stderr: ${mountResult.stderr || "(empty)"}`);

    if (mountResult.exitCode !== 0) {
      return {
        success: false,
        storageType,
        bucketName,
        mountPath: finalMountPath,
        error: `Mount command failed (exit ${mountResult.exitCode}): ${mountResult.stderr || mountResult.stdout || "no output"}`,
      };
    }

    await sandbox.commands.run(`rm -f ${credFile}`);

    return { success: true, storageType, bucketName, mountPath: finalMountPath };
  } catch (error) {
    return { success: false, storageType, bucketName, mountPath, error: toErrorMessage(error) };
  }
}
