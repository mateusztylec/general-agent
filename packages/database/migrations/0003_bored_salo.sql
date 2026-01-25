CREATE TABLE "opencode_sessions" (
	"tool_call_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"agent_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"url" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opencode_sessions" ADD CONSTRAINT "opencode_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opencode_sessions" ADD CONSTRAINT "opencode_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;