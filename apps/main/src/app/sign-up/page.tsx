import { SignupForm } from "@/components/signup-form"

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  )
}
