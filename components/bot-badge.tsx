import { ChatAvatar } from "@/components/chat-avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// A bot tagged in a message: its face and name, cut short when long
function BotBadge({
  bot,
  className,
}: {
  bot: { name: string; avatar: string }
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn("max-w-32 bg-background pl-0.5 align-middle", className)}
    >
      <ChatAvatar seed={bot.avatar} className="size-4" />
      <span className="truncate">{bot.name}</span>
    </Badge>
  )
}

export { BotBadge }
