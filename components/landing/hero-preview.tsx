import {
  ArrowUpIcon,
  CheckIcon,
  FileSpreadsheetIcon,
  GlobeIcon,
  MousePointer2Icon,
  TerminalIcon,
} from "lucide-react"

import { ChatAvatar } from "@/components/chat-avatar"

const steps = [
  { icon: GlobeIcon, label: "Opened docs.acme.dev" },
  { icon: TerminalIcon, label: "Ran python crawl.py on 412 pages" },
  { icon: FileSpreadsheetIcon, label: "Saved broken-links.csv" },
]

// A still of a direct chat beside the bot's computer, drawn rather than
// screenshotted so it follows the theme
export function HeroPreview() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card text-left shadow-2xl shadow-black/5 dark:shadow-black/40">
      <div className="flex h-11 items-center gap-3 border-b px-4">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ChatAvatar seed="ada-research" className="size-5" />
          <span className="font-medium">Ada</span>
          <span className="hidden text-muted-foreground sm:inline">
            Research analyst
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_1.15fr]">
        {/* Conversation */}
        <div className="flex flex-col gap-4 bg-background p-4 text-sm sm:p-5">
          <p className="ml-auto max-w-[85%] rounded-xl bg-secondary px-3.5 py-2.5">
            Find every broken link on our docs site and put them in a
            spreadsheet.
          </p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 font-medium">
              <ChatAvatar seed="ada-research" className="size-5" />
              Ada
            </div>
            <ul className="flex flex-col gap-1.5 font-mono text-xs text-muted-foreground">
              {steps.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                  <CheckIcon className="ml-auto size-3.5 shrink-0 text-brand" />
                </li>
              ))}
            </ul>
            <p className="leading-relaxed">
              Found <span className="font-medium">17 broken links</span> across
              9 pages. Most point at the old /v1 API reference. They&apos;re in
              broken-links.csv, grouped by page.
            </p>
          </div>
          <div className="mt-auto flex items-center justify-between rounded-lg border bg-card py-1.5 pr-1.5 pl-3 text-muted-foreground">
            Message Ada…
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ArrowUpIcon className="size-4" />
            </span>
          </div>
        </div>

        {/* Computer */}
        <div className="flex flex-col gap-3 border-t p-4 sm:p-5 md:border-t-0 md:border-l">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Ada&apos;s computer</span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-brand" />
              </span>
              LIVE
            </span>
          </div>
          <div className="relative aspect-4/3 overflow-hidden rounded-lg border bg-muted">
            {/* Browser */}
            <div className="absolute top-[7%] left-[5%] w-[78%] overflow-hidden rounded-md border bg-background shadow-sm">
              <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
                <span className="size-1.5 rounded-full bg-border" />
                <span className="size-1.5 rounded-full bg-border" />
                <span className="truncate rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  docs.acme.dev/v1/webhooks
                </span>
              </div>
              <div className="flex flex-col gap-2 p-3">
                <span className="font-heading text-2xl font-bold tracking-tight">
                  404
                </span>
                <span className="h-1.5 w-3/4 rounded-full bg-muted" />
                <span className="h-1.5 w-1/2 rounded-full bg-muted" />
                <span className="mt-1 h-5 w-20 rounded bg-brand/25" />
                <span className="h-1.5 w-2/3 rounded-full bg-muted" />
              </div>
            </div>
            <MousePointer2Icon className="absolute top-[47%] left-[22%] size-4 fill-foreground text-background" />
            {/* Terminal */}
            <div className="absolute right-[4%] bottom-[6%] w-[64%] rounded-md bg-neutral-950 p-3 font-mono text-[10px] leading-relaxed text-neutral-400 shadow-lg ring-1 ring-white/10 sm:text-[11px]">
              <p className="text-neutral-200">$ python crawl.py</p>
              <p>crawling 412 pages…</p>
              <p>
                <span className="text-red-400">✗</span> /v1/auth/tokens{" "}
                <span className="text-neutral-500">404</span>
              </p>
              <p>
                <span className="text-red-400">✗</span> /v1/webhooks{" "}
                <span className="text-neutral-500">404</span>
              </p>
              <p>
                <span className="text-brand">✓</span> done, 17 broken
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
