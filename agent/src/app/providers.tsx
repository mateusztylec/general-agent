"use client";

import type { ReactNode } from "react";
import { AgentUiProvider } from "@/app/components/agent-ui-provider";

export default function Providers({ children }: { children: ReactNode }) {
  return <AgentUiProvider>{children}</AgentUiProvider>;
}


