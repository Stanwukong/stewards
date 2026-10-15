import { auth } from "@clerk/nextjs/server"
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BoxIcon,
  EyeIcon,
  LockIcon,
} from "lucide-react"
import Link from "next/link"

import { ChatAvatar } from "@/components/chat-avatar"
import { Capabilities } from "@/components/landing/capabilities"
import { Faq } from "@/components/landing/faq"
import { HeroPreview } from "@/components/landing/hero-preview"
import { SiteHeader } from "@/components/landing/site-header"
import { TeamPreview } from "@/components/landing/team-preview"
import { Button } from "@/components/ui/button"
import { Wordmark } from "@/components/wordmark"

const steps = [
  {
    title: "Create",
    description:
      "Name it, give it a job in a phrase, and add instructions if you have them. It's ready in seconds, with a face and a computer of its own.",
  },
  {
    title: "Delegate",
    description:
      "Talk to it like a colleague. Describe the outcome you want, attach the files it needs, and let it work out the steps.",
  },
  {
    title: "Watch it work",
    description:
      "It runs commands, writes code and works its desktop, then comes back with the result. Open its screen whenever you want to look over its shoulder.",
  },
]

const useCases = [
  {
    name: "Ada",
    seed: "ada-research",
    job: "Research analyst",
    prompt:
      "Read these three reports and pull every figure on churn into one table.",
  },
  {
    name: "Kofi",
    seed: "kofi-data",
    job: "Data wrangler",
    prompt:
      "Clean up this CSV, merge the duplicate contacts and chart signups by month.",
  },
  {
    name: "Theo",
    seed: "theo-dev",
    job: "Developer",
    prompt:
      "Write a script that renames these photos by the date they were taken.",
  },
  {
    name: "Zara",
    seed: "zara-writer",
    job: "Writer",
    prompt: "Turn my meeting notes into a crisp update I can send to the team.",
  },
  {
    name: "Mira",
    seed: "mira-qa",
    job: "QA tester",
    prompt:
      "Run the test suite five times and tell me which failures are flaky.",
  },
  {
    name: "Sol",
    seed: "sol-ops",
    job: "Ops assistant",
    prompt:
      "Every time I send you invoices, file them by client and keep a running total.",
  },
]

const principles = [
  {
    icon: BoxIcon,
    title: "Sandboxed by default",
    description:
      "Each steward works on its own isolated computer, never on your laptop. Delete the steward and its computer goes with it.",
  },
  {
    icon: EyeIcon,
    title: "Nothing behind your back",
    description:
      "Every command and file shows up in the chat, and the live screen lets you watch the desktop as it moves.",
  },
  {
    icon: LockIcon,
    title: "Yours alone",
    description:
      "Your stewards, chats and memories are tied to your account. Nobody else can see them.",
  },
]

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 eyebrow">{children}</p>
}

export default async function Page() {
  const { userId } = await auth()
  const signedIn = userId !== null
  const startHref = signedIn ? "/chats" : "/sign-up"

  return (
    <>
      <SiteHeader signedIn={signedIn} />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] [background-size:24px_24px]"
          />
          <div
            aria-hidden
            className="absolute top-[55%] left-1/2 h-[28rem] w-[min(60rem,100%)] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px] dark:bg-brand/10"
          />
          <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-24 text-center sm:px-6 sm:pt-28">
            <div className="mb-8 inline-flex animate-in items-center gap-2 rounded-full border bg-background/80 px-4 py-2 backdrop-blur-sm duration-700 fill-mode-both fade-in slide-in-from-bottom-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
              </span>
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Free during early access
              </span>
            </div>
            <h1 className="mx-auto animate-in text-[clamp(3rem,9vw,7rem)] leading-[0.95] font-bold tracking-tighter text-balance delay-100 duration-700 fill-mode-both fade-in slide-in-from-bottom-4">
              Your work,
              <br />
              <span className="text-brand">handled.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl animate-in text-lg leading-relaxed text-pretty text-muted-foreground delay-200 duration-700 fill-mode-both fade-in slide-in-from-bottom-4 sm:text-xl">
              Stewards are AI bots you create, name and put to work. Each one
              gets its own computer, remembers what matters, and sees a job
              through from start to finish.
            </p>
            <div className="mt-10 flex animate-in flex-col items-center justify-center gap-3 delay-300 duration-700 fill-mode-both fade-in slide-in-from-bottom-4 sm:flex-row">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href={startHref} />}
                className="h-11 rounded-full px-6"
              >
                {signedIn ? "Open your stewards" : "Create your first steward"}
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<a href="#how-it-works" />}
                className="h-11 rounded-full px-6"
              >
                See how it works
              </Button>
            </div>
            <p className="mt-6 animate-in eyebrow delay-300 duration-700 fill-mode-both fade-in">
              No card · No waitlist
            </p>
            <div className="relative mx-auto mt-16 max-w-5xl animate-in delay-500 duration-1000 fill-mode-both fade-in slide-in-from-bottom-8 sm:mt-20">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Eyebrow>What you get</Eyebrow>
            <h2 className="mb-12 max-w-3xl text-[clamp(1.75rem,4vw,3rem)] leading-[1.1] font-semibold tracking-tight">
              Not another chatbot.
              <br />A colleague with{" "}
              <span className="text-brand">a desk of its own.</span>
            </h2>
            <Capabilities />
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-16 border-y bg-card py-24 sm:py-32"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mb-14 max-w-3xl text-[clamp(1.75rem,4vw,3rem)] leading-[1.1] font-semibold tracking-tight">
              From idea to helper
              <br />
              in <span className="text-brand">three steps.</span>
            </h2>
            <ol className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-3">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="group flex flex-col gap-4 bg-background p-6 sm:p-8"
                >
                  <span className="font-mono text-sm text-brand tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Teams */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
            <div>
              <Eyebrow>Group chats</Eyebrow>
              <h2 className="text-[clamp(1.75rem,4vw,3rem)] leading-[1.1] font-semibold tracking-tight">
                One steward is useful.
                <br />A crew is <span className="text-brand">unfair.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                Bring your stewards into one chat. @mention who should pick up a
                message, and they&apos;ll pass the work between themselves when
                someone else&apos;s job fits it better.
              </p>
              <ul className="mt-8 flex flex-col gap-3 text-sm">
                {[
                  "Each steward keeps its own computer, memory and voice",
                  "Handoffs come with a one-line reason, so you know why",
                  "Change who's in the group whenever the work changes",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <TeamPreview />
          </div>
        </section>

        {/* Use cases */}
        <section
          id="use-cases"
          className="scroll-mt-16 border-t py-24 sm:py-32"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Eyebrow>Put one to work</Eyebrow>
            <h2 className="mb-14 max-w-3xl text-[clamp(1.75rem,4vw,3rem)] leading-[1.1] font-semibold tracking-tight">
              As many specialists
              <br />
              as you <span className="text-brand">have jobs.</span>
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((useCase) => (
                <li
                  key={useCase.name}
                  className="group flex flex-col gap-6 rounded-xl border bg-card p-6 transition-all duration-300 hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5"
                >
                  <div className="flex items-center gap-3">
                    <ChatAvatar seed={useCase.seed} className="size-10" />
                    <div className="grid leading-tight">
                      <span className="font-heading font-semibold">
                        {useCase.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {useCase.job}
                      </span>
                    </div>
                    <ArrowUpRightIcon className="ml-auto size-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand" />
                  </div>
                  <p className="leading-relaxed">
                    &ldquo;{useCase.prompt}&rdquo;
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Principles */}
        <section className="border-y bg-card py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col gap-3">
                <span className="flex size-10 items-center justify-center rounded-full border bg-background">
                  <Icon className="size-4 text-brand" />
                </span>
                <h3 className="text-lg font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
            <div>
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="text-[clamp(1.75rem,4vw,3rem)] leading-[1.1] font-semibold tracking-tight">
                Questions,
                <br />
                <span className="text-brand">answered.</span>
              </h2>
            </div>
            <Faq />
          </div>
        </section>

        {/* Closing call to action */}
        <section className="px-4 pb-24 sm:px-6 sm:pb-32">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-foreground px-6 py-20 text-center text-background sm:py-28">
            <div
              aria-hidden
              className="absolute -top-40 left-1/2 h-80 w-[40rem] max-w-full -translate-x-1/2 rounded-full bg-brand/30 blur-[100px]"
            />
            <p className="relative mb-6 font-mono text-xs tracking-widest uppercase opacity-60">
              Free while in early access
            </p>
            <h2 className="relative text-[clamp(2.25rem,6vw,4.5rem)] leading-none font-bold tracking-tighter">
              Put your first steward
              <br />
              <span className="text-brand">to work.</span>
            </h2>
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href={startHref} />}
              className="relative mt-10 h-11 rounded-full bg-background px-6 text-foreground hover:bg-brand hover:text-brand-foreground"
            >
              {signedIn ? "Open your stewards" : "Get started for free"}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <Wordmark />
            <p className="text-sm text-muted-foreground">Your work, handled.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-brand">
              Features
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-brand"
            >
              How it works
            </a>
            <a href="#faq" className="transition-colors hover:text-brand">
              FAQ
            </a>
            <Link
              href={signedIn ? "/chats" : "/sign-in"}
              className="transition-colors hover:text-brand"
            >
              {signedIn ? "Open app" : "Sign in"}
            </Link>
          </nav>
          <p className="font-mono text-xs text-muted-foreground">
            © 2026 Stewards · Built by{" "}
            <a
              href="https://femiajanaku.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground transition-colors hover:text-brand"
            >
              Femi Ajanaku
            </a>
          </p>
        </div>
      </footer>
    </>
  )
}
