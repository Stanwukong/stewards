import { auth } from "@clerk/nextjs/server"

import { db } from "@/lib/db"

// One of the signed-in user's chats with the bot that represents it, or null
// when it doesn't exist or belongs to someone else
export async function getChat(chatId: string) {
  const { userId } = await auth.protect()

  const row = await db.query.chats.findFirst({
    where: (chats, { and, eq }) =>
      and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      // Direct chats have one bot; group chats fall back to the first to join
      members: {
        orderBy: (members, { asc }) => [asc(members.joinedAt)],
        limit: 1,
        with: {
          bot: {
            columns: {
              id: true,
              name: true,
              avatar: true,
              job: true,
              instructions: true,
            },
          },
        },
      },
    },
  })

  if (!row) return null

  const { members, ...chat } = row
  const bot = members[0]?.bot
  // A chat whose bots were all deleted has nothing to show
  return bot ? { ...chat, bot } : null
}

export type ChatWithBot = NonNullable<Awaited<ReturnType<typeof getChat>>>
