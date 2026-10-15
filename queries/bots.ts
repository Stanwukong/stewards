import { auth } from "@clerk/nextjs/server"

import { db } from "@/lib/db"
import { chatTitle } from "@/queries/chats"

// The signed-in user's chats, most recently active first, each with the bots
// whose faces and names represent it in lists
export async function getChats() {
  const { userId } = await auth.protect()

  const rows = await db.query.chats.findMany({
    where: (chats, { eq }) => eq(chats.userId, userId),
    orderBy: (chats, { desc }) => [desc(chats.lastMessageAt)],
    with: {
      members: {
        orderBy: (members, { asc }) => [asc(members.joinedAt)],
        with: {
          bot: { columns: { id: true, name: true, avatar: true, job: true } },
        },
      },
    },
  })

  return rows.flatMap(({ members, ...chat }) => {
    const bots = members.map((member) => member.bot)
    // A chat whose bots were all deleted has nothing to show
    if (bots.length === 0) return []
    return [{ ...chat, bots, title: chatTitle(chat.name, bots) }]
  })
}

export type ChatListItem = Awaited<ReturnType<typeof getChats>>[number]

// The signed-in user's bots, oldest first, for picking group chat members
export async function getBots() {
  const { userId } = await auth.protect()

  return db.query.bots.findMany({
    where: (bots, { eq }) => eq(bots.userId, userId),
    orderBy: (bots, { asc }) => [asc(bots.createdAt)],
    columns: { id: true, name: true, avatar: true },
  })
}

export type BotListItem = Awaited<ReturnType<typeof getBots>>[number]
