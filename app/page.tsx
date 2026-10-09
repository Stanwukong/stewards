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
    <Empty className="min-h-[calc(100svh-3.5rem)]">
      <EmptyHeader>
        <EmptyMedia>
          <ChatAvatar seed={crypto.randomUUID()} animated className="size-12" />
        </EmptyMedia>
        <EmptyTitle>Meet your first bot</EmptyTitle>
        <EmptyDescription>
          Every bot gets its own personality, memory, and face. Spin one up and
          start the conversation.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <BotDialog
          trigger={
            <Button variant="secondary" size="lg">
              <PlusIcon data-icon="inline-start" />
              Create a new bot
            </Button>
          }
        />
      </EmptyContent>
    </Empty>
  )
}
