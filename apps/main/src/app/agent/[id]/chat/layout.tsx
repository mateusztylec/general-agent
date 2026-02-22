import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type React from "react";
import { auth } from "@/lib/auth";
import { db } from "@general-agent/database/client";
import { getAgentsWithSessions } from "@general-agent/database/queries/chat-sessions";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const agentsWithSessions = await getAgentsWithSessions(db, session.user.id);

  return (
    <SidebarProvider className="h-svh">
      <ChatSidebar agentsWithSessions={agentsWithSessions} />
      <SidebarInset className="overflow-hidden">{children}</SidebarInset>
    </SidebarProvider>
  );
}
