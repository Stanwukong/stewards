import { BotDialog } from "@/components/bot-dialog"
import { ComputerPanelToggle } from "@/components/computer-panel"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { Button } from "@/components/ui/button"
import type { ChatWithBots } from "@/queries/chats"

export function ChatHeader({ chat }: { chat: ChatWithBots }) {
  const title = (
    <>
      <GroupChatAvatar bots={chat.bots} className="size-5" />
      <h1 className="truncate text-sm font-medium">{chat.title}</h1>
    </>
  )

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-background px-4">
      {chat.kind === "direct" ? (
        <>
          <BotDialog
            bot={chat.bots[0]}
            trigger={
              <Button variant="ghost" size="sm" className="-ml-2 min-w-0">
                {title}
              </Button>
            }
          />
          <ComputerPanelToggle />
        </>
      ) : (
        // Group chats have no single bot to edit or computer to show
        <div className="flex min-w-0 items-center gap-1.5">{title}</div>
      )}
    </header>
  )
}
