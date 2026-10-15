import { ChatAvatar } from "@/components/chat-avatar"
import { cn } from "@/lib/utils"

const MAX_FACES = 3

// Where each face sits inside the square, by how many items it holds
const layouts = {
  // Side by side, overlapping in the middle
  2: ["top-[19%] left-0 size-[62%]", "top-[19%] right-0 size-[62%]"],
  // A triangle, point up
  3: [
    "top-0 left-1/4 size-1/2",
    "bottom-0 left-0 size-1/2",
    "right-0 bottom-0 size-1/2",
  ],
  // A 2x2 grid, the last cell counting the bots without a face
  4: [
    "top-0 left-0 size-1/2",
    "top-0 right-0 size-1/2",
    "bottom-0 left-0 size-1/2",
    "right-0 bottom-0 size-1/2",
  ],
} as const

// The faces of a chat's bots, packed into the same square a single
// ChatAvatar takes, so size it with the same classes
function GroupChatAvatar({
  bots,
  className,
}: {
  bots: { id: string; avatar: string }[]
  className?: string
}) {
  if (bots.length === 1) {
    return <ChatAvatar seed={bots[0].avatar} className={className} />
  }

  const faces = bots.slice(0, MAX_FACES)
  const hidden = bots.length - faces.length
  const slots = layouts[Math.min(bots.length, 4) as keyof typeof layouts]

  return (
    <div className={cn("@container relative size-8 shrink-0", className)}>
      {faces.map((bot, i) => (
        <ChatAvatar
          key={bot.id}
          seed={bot.avatar}
          className={cn("absolute", slots[i])}
        />
      ))}
      {hidden > 0 && (
        <span
          className={cn(
            "absolute flex items-center justify-center rounded-full bg-muted text-[22cqw] leading-none font-medium text-muted-foreground",
            slots[3]
          )}
        >
          +{hidden}
        </span>
      )}
    </div>
  )
}

export { GroupChatAvatar }
