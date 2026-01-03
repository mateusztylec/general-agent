import HomeClient from "@/app/components/home-client";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <HomeClient />
      </main>
    </div>
  );
}
