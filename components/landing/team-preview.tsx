import { ArrowRightLeftIcon } from "lucide-react"

import { ChatAvatar } from "@/components/chat-avatar"
import { GroupChatAvatar } from "@/components/group-chat-avatar"

const crew = [
  { id: "ada", avatar: "ada-research", name: "Ada" },
  { id: "zara", avatar: "zara-writer", name: "Zara" },
  { id: "kofi", avatar: "kofi-data", name: "Kofi" },
]

function Mention({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-brand/15 px-1 py-px font-medium text-foreground">
      @{children}
    </span>
  )
}

// A still of a group chat where one bot hands the message to another
export function TeamPreview() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-black/5 dark:shadow-black/40">
      <div className="flex h-11 items-center gap-2 border-b px-4 text-sm">
        <GroupChatAvatar bots={crew} className="size-5" />
        <span className="font-medium">Launch crew</span>
        <span className="truncate text-muted-foreground">
          {crew.map((bot) => bot.name).join(", ")}
        </span>
      </div>
      <div className="flex flex-col gap-5 bg-background p-4 text-sm sm:p-5">
        <p className="ml-auto max-w-[88%] rounded-xl bg-secondary px-3.5 py-2.5">
          <Mention>Kofi</Mention> how did signups do this week? Then get it
          written up for the team.
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-medium">
            <ChatAvatar seed="kofi-data" className="size-5" />
            Kofi
          </div>
          <p className="leading-relaxed">
            Up 18% on last week, and most of the jump came from the referral
            link. I&apos;ve charted it in signups.png.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 font-mono text-xs text-muted-foreground">
            <ArrowRightLeftIcon className="size-3.5 shrink-0 text-brand" />
            <span className="truncate">
              Handed off to Zara, who writes the team updates
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-medium">
            <ChatAvatar seed="zara-writer" className="size-5" />
            Zara
          </div>
          <p className="border-l-2 border-brand pl-3 leading-relaxed text-muted-foreground">
            Signups grew 18% this week, led by referrals. We&apos;ll double down
            on the referral link next sprint. Chart attached.
          </p>
        </div>
      </div>
    </div>
  )
}
