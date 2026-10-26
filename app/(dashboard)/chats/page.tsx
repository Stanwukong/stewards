import { PlusIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { getBots } from "@/queries/bots"

export default async function Page() {
  const hasBots = (await getBots()).length > 0

  return (
    <>
      {/* On phones the sidebar is a sheet, and this is the only way to open it */}
      <header className="flex h-14 items-center px-4 md:hidden">
        <SidebarTrigger className="-ml-1" />
      </header>
      <Empty className="relative min-h-[calc(100svh-3.5rem)] overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)] [background-size:24px_24px]"
        />
        <EmptyHeader className="relative">
          <EmptyMedia>
            <ChatAvatar
              seed={crypto.randomUUID()}
              animated
              className="size-16"
            />
          </EmptyMedia>
          {hasBots ? (
            <>
              <p className="eyebrow">Your bots</p>
              <EmptyTitle className="text-3xl font-semibold tracking-tight">
                Pick up where you <span className="text-brand">left off.</span>
              </EmptyTitle>
              <EmptyDescription className="text-base">
                Open a chat from the sidebar, or make another bot for a new job.
              </EmptyDescription>
            </>
          ) : (
            <>
              <p className="eyebrow">Get started</p>
              <EmptyTitle className="text-3xl font-semibold tracking-tight">
                Meet your first <span className="text-brand">bot.</span>
              </EmptyTitle>
              <EmptyDescription className="text-base">
                Every bot gets its own personality, memory, face and computer.
                Spin one up and start the conversation.
              </EmptyDescription>
            </>
          )}
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
    </>
  )
}
