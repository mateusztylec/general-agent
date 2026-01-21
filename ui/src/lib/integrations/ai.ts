import { createAnthropic } from "@ai-sdk/anthropic";
import { serverEnv } from "@/lib/config/env-server";

export const anthropic = createAnthropic({
  apiKey: serverEnv.ANTHROPIC_API_KEY!,
});