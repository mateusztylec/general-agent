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
		// Determine mount path
		const finalMountPath = mountPath || `/home/user/${bucketName}`;

		// Create mount directory
		await sandbox.commands.run(`mkdir -p ${finalMountPath}`);

		// Write credentials file
		const credFile = "/root/.passwd-s3fs";
		const credContent = `${credData.accessKeyId}:${credData.secretAccessKey}`;
		await sandbox.commands.run(`echo '${credContent}' > ${credFile}`);
		await sandbox.commands.run(`chmod 600 ${credFile}`);

		// Build mount command
		const flags = [`-o url=https://${credData.endpoint}`, "-o allow_other"];

		if (accessMode === "readonly") {
			flags.push("-o ro");
		}

		const mountCmd = `s3fs ${flags.join(" ")} ${bucketName} ${finalMountPath}`;

		// Execute mount
		const mountResult = await sandbox.commands.run(mountCmd);

		if (mountResult.exitCode !== 0) {
			return {
				success: false,
				storageType: "s3",
				bucketName,
				mountPath: finalMountPath,
				error: `Mount command failed: ${mountResult.stderr}`,
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
		const errorMessage = error instanceof Error ? error.message : String(error);
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
		// Determine mount path
		const finalMountPath = mountPath || `/home/user/${bucketName}`;

		// Create mount directory
		await sandbox.commands.run(`mkdir -p ${finalMountPath}`);

		// Write credentials file
		const credFile = "/root/.passwd-s3fs";
		const credContent = `${credData.accessKeyId}:${credData.secretAccessKey}`;
		await sandbox.commands.run(`echo '${credContent}' > ${credFile}`);
		await sandbox.commands.run(`chmod 600 ${credFile}`);

		// Build mount command with R2 endpoint
		// R2 endpoint format: https://<account-id>.r2.cloudflarestorage.com
		const flags = [`-o url=https://${credData.endpoint}`, "-o allow_other"];

		if (accessMode === "readonly") {
			flags.push("-o ro");
		}

		const mountCmd = `s3fs ${flags.join(" ")} ${bucketName} ${finalMountPath}`;

		// Execute mount
		const mountResult = await sandbox.commands.run(mountCmd);

		if (mountResult.exitCode !== 0) {
			return {
				success: false,
				storageType: "r2",
				bucketName,
				mountPath: finalMountPath,
				error: `Mount command failed: ${mountResult.stderr}`,
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
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			storageType: "r2",
			bucketName,
			mountPath,
			error: errorMessage,
		};
	}
}
