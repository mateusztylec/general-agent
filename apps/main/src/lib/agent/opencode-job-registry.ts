type OpencodeJobEntry = {
  sessionId: string;
  url: string;
  token: string;
  updatedAt: number;
};

const JOB_TTL_MS = 15 * 60 * 1000;
const jobMap = new Map<string, OpencodeJobEntry>();

function cleanupExpiredJobs(now: number) {
  for (const [jobId, entry] of jobMap.entries()) {
    if (now - entry.updatedAt > JOB_TTL_MS) {
      jobMap.delete(jobId);
    }
  }
}

export function setOpencodeJob(
  jobId: string,
  data: { sessionId: string; url: string; token: string }
) {
  const now = Date.now();
  cleanupExpiredJobs(now);
  jobMap.set(jobId, { ...data, updatedAt: now });
}

export function getOpencodeJob(jobId: string) {
  return jobMap.get(jobId);
}

export async function waitForOpencodeJob(
  jobId: string,
  opts: { timeoutMs: number; intervalMs: number }
) {
  const start = Date.now();
  while (Date.now() - start < opts.timeoutMs) {
    const entry = getOpencodeJob(jobId);
    if (entry) return entry;
    await new Promise((resolve) => setTimeout(resolve, opts.intervalMs));
  }
  return undefined;
}
