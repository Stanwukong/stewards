import { anthropic } from "@ai-sdk/anthropic"
import { chat } from "@trigger.dev/sdk/ai"

import { db } from "@/lib/db"
import type { Bot } from "@/lib/db/schema"

// The bot speaks as itself, not as the underlying model
function instructionsFor({
  name,
  job,
  instructions,
}: Pick<Bot, "name" | "job" | "instructions">) {
  return [
    `You are ${name}, a ${job}.`,
    `When asked who you are, introduce yourself as ${name} and describe yourself as a ${job}. Stay in this role for the whole conversation.`,
    instructions,
  ]
    .filter(Boolean)
    .join("\n\n")
}

// The bot that represents a chat. The server actions have already checked the
// chat belongs to the signed-in user, so this runs without Clerk.
async function getChatBot(chatId: string) {
  const member = await db.query.chatMembers.findFirst({
    where: (members, { eq }) => eq(members.chatId, chatId),
    // Direct chats have one bot; group chats fall back to the first to join
    orderBy: (members, { asc }) => [asc(members.joinedAt)],
    with: {
      bot: { columns: { name: true, job: true, instructions: true } },
    },
  })
  return member?.bot ?? null
}

// Conversations persist in the default transcript storage, keyed by chatId
export const botChat = chat.agent({
  id: "bot-chat",
  run: async ({ chatId, messages, signal, streamText }) => {
    const bot = await getChatBot(chatId)
    if (!bot) throw new Error("Chat not found")

    return streamText({
      model: anthropic("claude-sonnet-5-5"),
      instructions: instructionsFor(bot),
      messages,
      abortSignal: signal,
    })
  },
})
