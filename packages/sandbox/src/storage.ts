import type { StorageConfig } from "@general-agent/agent/config-types";
import type { Sandbox } from "e2b";

export interface StorageCredentials {
  s3_credentials: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  r2_credentials: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export type StorageCredentialType = keyof StorageCredentials;

export interface DecryptedCredential {
  type: string;
  data: Record<string, unknown>;
}

export interface MountResult {
  success: boolean;
  storageType: string;
  bucketName: string;
  mountPath: string;
  error?: string;
}

export interface MountStorageOptions {
  sandbox: Sandbox;
  storageConfigs: StorageConfig[];
  getCredential: (id: string) => Promise<DecryptedCredential>;
}

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

      // Mount based on storage type
      let result: MountResult;
      if (storageConfig.type === "s3") {
        result = await mountS3(sandbox, storageConfig, credential);
      } else if (storageConfig.type === "r2") {
        result = await mountR2(sandbox, storageConfig, credential);
      } else {
        console.warn("[Storage] Unsupported storage type:", storageConfig.type);
        result = {
          success: false,
          storageType: storageConfig.type,
          bucketName: storageConfig.config?.bucketName || "unknown",
          mountPath: storageConfig.config?.mountPath || "unknown",
          error: `Unsupported storage type: ${storageConfig.type}`,
        };
      }

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
 * Mount S3 bucket using s3fs
 */
async function mountS3(
  sandbox: Sandbox,
  storageConfig: StorageConfig,
  credential: DecryptedCredential,
): Promise<MountResult> {
  const config = storageConfig.config;
  if (!config) {
    return {
      success: false,
      storageType: "s3",
      bucketName: "unknown",
      mountPath: "unknown",
      error: "Missing storage config details",
    };
  }

  const { bucketName, mountPath, accessMode } = config;
  const credData = credential.data as StorageCredentials["s3_credentials"];

  if (!credData.accessKeyId || !credData.secretAccessKey) {
    return {
      success: false,
      storageType: "s3",
      bucketName,
      mountPath,
      error: "Missing S3 credentials (accessKeyId or secretAccessKey)",
    };
  }

  try {
    // Determine mount path from config (absolute paths are kept as-is)
    const finalMountPath = resolveMountPath(bucketName, mountPath);
    const endpoint = normalizeEndpoint(credData.endpoint);

    // Create mount directory
    try {
      await sandbox.commands.run(`sudo mkdir -p ${shellEscape(finalMountPath)}`);
    } catch (error) {
      return {
        success: false,
        storageType: "s3",
        bucketName,
        mountPath: finalMountPath,
        error: `Failed to create mount directory "${finalMountPath}": ${toDetailedErrorMessage(error)}`,
      };
    }

    // Write credentials file without shell interpolation (safer for special characters)
    const credFile = "/home/user/.passwd-s3fs";
    const credContent = `${credData.accessKeyId}:${credData.secretAccessKey}`;
    try {
      await sandbox.files.write(credFile, credContent);
      await sandbox.commands.run(`chmod 600 ${shellEscape(credFile)}`);
    } catch (error) {
      return {
        success: false,
        storageType: "s3",
        bucketName,
        mountPath: finalMountPath,
        error: `Failed to prepare credential file "${credFile}": ${toDetailedErrorMessage(error)}`,
      };
    }

    // Build mount command
    const flags = [
      `-o url=https://${endpoint}`,
      `-o passwd_file=${shellEscape(credFile)}`,
      "-o allow_other",
      "-o dbglevel=debug",
    ];

    if (accessMode === "readonly") {
      flags.push("-o ro");
    }

    const mountCmd = `sudo s3fs ${flags.join(" ")} ${shellEscape(bucketName)} ${shellEscape(finalMountPath)}`;
    console.log(`[Storage] S3 mount command: ${mountCmd}`);

    // Check if s3fs is available
    try {
      const s3fsCheck = await sandbox.commands.run("which s3fs");
      console.log(
        `[Storage] s3fs binary: ${s3fsCheck.stdout.trim() || "NOT FOUND"} (exit: ${s3fsCheck.exitCode})`,
      );
    } catch (error) {
      return {
        success: false,
        storageType: "s3",
        bucketName,
        mountPath: finalMountPath,
        error: `Failed to check s3fs binary: ${toDetailedErrorMessage(error)}`,
      };
    }

    // Execute mount
    let mountResult: SandboxCommandResult;
    try {
      mountResult = await sandbox.commands.run(mountCmd);
    } catch (error) {
      return {
        success: false,
        storageType: "s3",
        bucketName,
        mountPath: finalMountPath,
        error: `Mount command threw before completion: ${toDetailedErrorMessage(error)}`,
      };
    }
    console.log(`[Storage] S3 mount exit code: ${mountResult.exitCode}`);
    console.log(
      `[Storage] S3 mount stdout: ${mountResult.stdout || "(empty)"}`,
    );
    console.log(
      `[Storage] S3 mount stderr: ${mountResult.stderr || "(empty)"}`,
    );

    if (mountResult.exitCode !== 0) {
      return {
        success: false,
        storageType: "s3",
        bucketName,
        mountPath: finalMountPath,
        error: `Mount command failed (exit ${mountResult.exitCode}): ${mountResult.stderr || mountResult.stdout || "no output"}`,
      };
    }

    // Clean up credentials file (credentials are now cached in kernel)
    await sandbox.commands.run(`rm -f ${credFile}`);

    return {
      success: true,
      storageType: "s3",
      bucketName,
      mountPath: finalMountPath,
    };
  } catch (error) {
    const errorMessage = toErrorMessage(error);
    return {
      success: false,
      storageType: "s3",
      bucketName,
      mountPath,
      error: errorMessage,
    };
  }
}

/**
 * Mount R2 bucket using s3fs with R2-specific endpoint
 */
async function mountR2(
  sandbox: Sandbox,
  storageConfig: StorageConfig,
  credential: DecryptedCredential,
): Promise<MountResult> {
  const config = storageConfig.config;
  if (!config) {
    return {
      success: false,
      storageType: "r2",
      bucketName: "unknown",
      mountPath: "unknown",
      error: "Missing storage config details",
    };
  }

  const { bucketName, mountPath, accessMode } = config;
  const credData = credential.data as StorageCredentials["r2_credentials"];

  if (!credData.accessKeyId || !credData.secretAccessKey) {
    return {
      success: false,
      storageType: "r2",
      bucketName,
      mountPath,
      error: "Missing R2 credentials (accessKeyId or secretAccessKey)",
    };
  }

  try {
    // Determine mount path from config (absolute paths are kept as-is)
    const finalMountPath = resolveMountPath(bucketName, mountPath);
    const endpoint = normalizeEndpoint(credData.endpoint);

    // Create mount directory
    try {
      await sandbox.commands.run(`sudo mkdir -p ${shellEscape(finalMountPath)}`);
    } catch (error) {
      return {
        success: false,
        storageType: "r2",
        bucketName,
        mountPath: finalMountPath,
        error: `Failed to create mount directory "${finalMountPath}": ${toDetailedErrorMessage(error)}`,
      };
    }

    // Write credentials file without shell interpolation (safer for special characters)
    const credFile = "/home/user/.passwd-s3fs";
    const credContent = `${credData.accessKeyId}:${credData.secretAccessKey}`;
    try {
      await sandbox.files.write(credFile, credContent);
      await sandbox.commands.run(`chmod 600 ${shellEscape(credFile)}`);
    } catch (error) {
      return {
        success: false,
        storageType: "r2",
        bucketName,
        mountPath: finalMountPath,
        error: `Failed to prepare credential file "${credFile}": ${toDetailedErrorMessage(error)}`,
      };
    }

    // Build mount command with R2 endpoint
    // R2 endpoint format: https://<account-id>.r2.cloudflarestorage.com
    const flags = [
      `-o url=https://${endpoint}`,
      `-o passwd_file=${shellEscape(credFile)}`,
      "-o allow_other",
      "-o use_path_request_style",
      "-o dbglevel=debug",
    ];

    if (accessMode === "readonly") {
      flags.push("-o ro");
    }

    const mountCmd = `sudo s3fs ${flags.join(" ")} ${shellEscape(bucketName)} ${shellEscape(finalMountPath)}`;
    console.log(`[Storage] R2 mount command: ${mountCmd}`);

    // Check if s3fs is available
    try {
      const s3fsCheck = await sandbox.commands.run("which s3fs");
      console.log(
        `[Storage] s3fs binary: ${s3fsCheck.stdout.trim() || "NOT FOUND"} (exit: ${s3fsCheck.exitCode})`,
      );
    } catch (error) {
      return {
        success: false,
        storageType: "r2",
        bucketName,
        mountPath: finalMountPath,
        error: `Failed to check s3fs binary: ${toDetailedErrorMessage(error)}`,
      };
    }

    // Execute mount
    let mountResult: SandboxCommandResult;
    try {
      mountResult = await sandbox.commands.run(mountCmd);
    } catch (error) {
      return {
        success: false,
        storageType: "r2",
        bucketName,
        mountPath: finalMountPath,
        error: `Mount command threw before completion: ${toDetailedErrorMessage(error)}`,
      };
    }
    console.log(`[Storage] R2 mount exit code: ${mountResult.exitCode}`);
    console.log(
      `[Storage] R2 mount stdout: ${mountResult.stdout || "(empty)"}`,
    );
    console.log(
      `[Storage] R2 mount stderr: ${mountResult.stderr || "(empty)"}`,
    );

    if (mountResult.exitCode !== 0) {
      return {
        success: false,
        storageType: "r2",
        bucketName,
        mountPath: finalMountPath,
        error: `Mount command failed (exit ${mountResult.exitCode}): ${mountResult.stderr || mountResult.stdout || "no output"}`,
      };
    }

    // Clean up credentials file
    await sandbox.commands.run(`rm -f ${credFile}`);

    return {
      success: true,
      storageType: "r2",
      bucketName,
      mountPath: finalMountPath,
    };
  } catch (error) {
    const errorMessage = toErrorMessage(error);
    return {
      success: false,
      storageType: "r2",
      bucketName,
      mountPath,
      error: errorMessage,
    };
  }
}
