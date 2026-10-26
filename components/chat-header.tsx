import { BotDialog } from "@/components/bot-dialog"
import { ComputerPanelToggle } from "@/components/computer-panel"
import { GroupChatAvatar } from "@/components/group-chat-avatar"
import { GroupChatDialog } from "@/components/group-chat-dialog"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { BotListItem } from "@/queries/bots"
import type { ChatWithBots } from "@/queries/chats"

export function ChatHeader({
  chat,
  bots,
}: {
  chat: ChatWithBots
  // The user's bots, for changing a group's members
  bots: BotListItem[]
}) {
  const title = (
    <>
      <GroupChatAvatar bots={chat.bots} className="size-5" />
      <h1 className="truncate text-sm font-medium">{chat.title}</h1>
    </>
  )
  const trigger = (
    <Button variant="ghost" size="sm" className="-ml-2 min-w-0">
      {title}
    </Button>
  )

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-background px-4">
      {/* On phones the sidebar is a sheet, and this is the only way to open it */}
      <SidebarTrigger className="-ml-1 md:hidden" />
      {chat.kind === "direct" ? (
        <>
          <BotDialog bot={chat.bots[0]} trigger={trigger} />
          <ComputerPanelToggle />
        </>
      ) : (
        // Group chats have no single computer to show
        <GroupChatDialog
          chat={{
            id: chat.id,
            name: chat.name,
            botIds: chat.bots.map((bot) => bot.id),
          }}
          bots={bots}
          trigger={trigger}
        />
      )}
    </header>
  )
}
