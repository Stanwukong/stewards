import { auth } from "@clerk/nextjs/server"

import { db } from "@/lib/db"

// The signed-in user's chats, most recently active first, each with the bot
// whose face and name represent it in lists
export async function getChats() {
  const { userId } = await auth.protect()

  const rows = await db.query.chats.findMany({
    where: (chats, { eq }) => eq(chats.userId, userId),
    orderBy: (chats, { desc }) => [desc(chats.lastMessageAt)],
    with: {
      // Direct chats have one bot; group chats fall back to the first to join
      members: {
        orderBy: (members, { asc }) => [asc(members.joinedAt)],
        limit: 1,
        with: {
          bot: { columns: { id: true, name: true, avatar: true, job: true } },
        },
      },
    },
  })

  return rows.flatMap(({ members, ...chat }) => {
    const bot = members[0]?.bot
    // A chat whose bots were all deleted has nothing to show
    return bot ? [{ ...chat, bot }] : []
  })
}

export type ChatListItem = Awaited<ReturnType<typeof getChats>>[number]
