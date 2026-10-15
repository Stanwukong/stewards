import Link from "next/link"

import { ChatAvatar } from "@/components/chat-avatar"
import { Wordmark } from "@/components/wordmark"

const faces = ["ada-research", "kofi-data", "zara-writer", "theo-dev"]

// Sign-in and sign-up pages: a dark brand panel beside Clerk's form
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-10 text-background lg:flex">
        <div
          aria-hidden
          className="absolute -bottom-40 -left-20 size-[32rem] rounded-full bg-brand/25 blur-[120px]"
        />
        <Link href="/" className="relative w-fit">
          <Wordmark />
        </Link>
        <div className="relative">
          <div className="mb-8 flex -space-x-2">
            {faces.map((seed) => (
              <ChatAvatar
                key={seed}
                seed={seed}
                className="size-10 ring-4 ring-foreground"
              />
            ))}
          </div>
          <p className="font-heading text-5xl leading-[1.05] font-bold tracking-tighter">
            Your work,
            <br />
            <span className="text-brand">handled.</span>
          </p>
          <p className="mt-4 max-w-sm leading-relaxed opacity-60">
            AI bots with a name, a job and a computer of their own.
          </p>
        </div>
        <p className="relative font-mono text-xs tracking-widest uppercase opacity-50">
          Free during early access
        </p>
      </aside>
      <main className="flex flex-col items-center justify-center gap-8 p-6">
        <Link href="/" className="lg:hidden">
          <Wordmark />
        </Link>
        {children}
      </main>
    </div>
  )
}
