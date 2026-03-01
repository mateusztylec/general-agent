import { redirect } from "next/navigation"
import { db } from "@general-agent/database/client"
import { user } from "@general-agent/database/schema"
import { count } from "drizzle-orm"
import { SetupForm } from "@/components/setup-form"

export default async function SetupPage() {
  const [result] = await db.select({ count: count() }).from(user)
  if (result.count > 0) redirect("/sign-in")

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <SetupForm />
      </div>
    </div>
  )
}
