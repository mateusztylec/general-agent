import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Reference: ./env-vars.md

export const serverEnv = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    // Required for @anthropic-ai/claude-agent-sdk
    ANTHROPIC_API_KEY: z.string().min(1),

    // Remote sandbox worker config
    SANDBOX_BEARER_TOKEN: z.string().min(1),
    SANDBOX_WORKER_URL: z.url().optional().default("http://localhost:8787"),
  },

  /*
   * Due to how Next.js bundles environment variables on Edge and Client,
   * we need to manually destructure them to make sure all are included in bundle.
   *
   * 💡 You'll get type errors if not all variables from `server` & `client` are included here.
   */
  runtimeEnv: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    SANDBOX_BEARER_TOKEN: process.env.SANDBOX_BEARER_TOKEN,
    SANDBOX_WORKER_URL: process.env.SANDBOX_WORKER_URL,
  },
});
