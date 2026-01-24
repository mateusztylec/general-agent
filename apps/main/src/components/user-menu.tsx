"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UserMenu({ userName }: { userName: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">{userName}</span>
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        Sign out
      </Button>
    </div>
  );
}
