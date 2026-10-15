import { auth } from "@clerk/nextjs/server"

import { db } from "@/lib/db"

// One of the signed-in user's chats with its bots in the order they joined, or
// null when it doesn't exist or belongs to someone else
export async function getChat(chatId: string) {
  const { userId } = await auth.protect()

  const row = await db.query.chats.findFirst({
    where: (chats, { and, eq }) =>
      and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      members: {
        orderBy: (members, { asc }) => [asc(members.joinedAt)],
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
  const bots = members.map((member) => member.bot)
  // A chat whose bots were all deleted has nothing to show
  if (bots.length === 0) return null

  return { ...chat, bots, title: chatTitle(chat.name, bots) }
}

export type ChatWithBots = NonNullable<Awaited<ReturnType<typeof getChat>>>

// Direct chats go by their bot's name; an unnamed group by its members'
export function chatTitle(name: string | null, bots: { name: string }[]) {
  return name ?? bots.map((bot) => bot.name).join(", ")
}
