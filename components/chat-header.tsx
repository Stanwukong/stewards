import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { ComputerPanelToggle } from "@/components/computer-panel"
import { Button } from "@/components/ui/button"
import type { ChatWithBot } from "@/queries/chats"

export function ChatHeader({ chat }: { chat: ChatWithBot }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-background px-4">
      <BotDialog
        bot={chat.bot}
        trigger={
          <Button variant="ghost" size="sm" className="-ml-2 min-w-0">
            <ChatAvatar seed={chat.bot.avatar} className="size-5" />
            <h1 className="truncate text-sm font-medium">
              {chat.name ?? chat.bot.name}
            </h1>
          </Button>
        }
      />
      <ComputerPanelToggle />
    </header>
  )
}
