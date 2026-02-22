"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { AgentWithSessions } from "@general-agent/database/queries/chat-sessions";

type Props = {
  agentsWithSessions: AgentWithSessions[];
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function ChatSidebar({ agentsWithSessions }: Props) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Agents</SidebarGroupLabel>
          <SidebarMenu>
            {agentsWithSessions.map((agent) => (
              <Collapsible
                key={agent.id}
                asChild
                defaultOpen={false}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={agent.name}>
                      <span>{agent.name}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <Link href={`/agent/${agent.id}/chat`}>
                            <Plus className="h-3 w-3" />
                            <span>New thread</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {agent.sessions.map((session) => (
                        <SidebarMenuSubItem key={session.id}>
                          <SidebarMenuSubButton asChild>
                            <Link href={`/agent/${agent.id}/chat/${session.id}`}>
                              <span className="flex-1 truncate">
                                {formatDate(session.createdAt)}
                              </span>
                              <span
                                className={`text-xs px-1 rounded ${
                                  session.status === "active"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {session.status}
                              </span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
