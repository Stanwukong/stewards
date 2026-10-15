import { auth } from "@clerk/nextjs/server"
import { PlusIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function Page() {
  await auth.protect()

  return (
    <Empty className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)] [background-size:24px_24px]"
      />
      <EmptyHeader className="relative">
        <EmptyMedia>
          <ChatAvatar seed={crypto.randomUUID()} animated className="size-16" />
        </EmptyMedia>
        <p className="eyebrow">Get started</p>
        <EmptyTitle className="text-3xl font-semibold tracking-tight">
          Meet your first <span className="text-brand">bot.</span>
        </EmptyTitle>
        <EmptyDescription className="text-base">
          Every bot gets its own personality, memory, face and computer. Spin
          one up and start the conversation.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="relative">
        <BotDialog
          trigger={
            <Button size="lg" className="h-10 rounded-full px-5">
              <PlusIcon data-icon="inline-start" />
              Create a new bot
            </Button>
          }
        />
      </EmptyContent>
    </Empty>
  )
}
