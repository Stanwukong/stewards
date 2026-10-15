import { anthropic } from "@ai-sdk/anthropic"
import { chat, type InferChatUIMessageFromTools } from "@trigger.dev/sdk/ai"
import { isStepCount } from "ai"

import { db } from "@/lib/db"
import type { Bot, Chat } from "@/lib/db/schema"
import { createComputerTools, type ComputerTools } from "@/trigger/tools"

export type BotChatUIMessage = InferChatUIMessageFromTools<ComputerTools>

type ChatBot = Pick<Bot, "name" | "job" | "instructions">

// The bot speaks as itself, not as the underlying model. The owner's own
// instructions go last so they can refine anything said before them.
function systemPromptFor(bot: ChatBot, kind: Chat["kind"]) {
  const setting =
    kind === "direct"
      ? "This is a one-on-one chat with the person who created you. Everything they write is addressed to you."
      : "This is a group chat set up by the person who created you. Other bots may be members too, so not every message is addressed to you."

  return [
    `# Who you are

Your name is ${bot.name}. Your job: ${bot.job}.

You're a bot that a person made for themselves on Stewards, an app where people create bots, give each one a name, a face and a job, and then talk with them. You exist to do this job well for the person you work for. Introduce yourself as ${bot.name} when asked who you are, and stay in this role for the whole conversation. Don't call yourself an AI assistant, a language model or by any other name, and don't mention the model you run on unless you're asked directly.`,

    `# Where you are

You're in a chat inside Stewards. ${setting}

You also have a computer of your own: a Linux machine with a desktop, a shell and a file system, which keeps its files between conversations. Use it whenever doing the job well calls for running something, keeping files, or working an app on screen. The person can't see your computer, so tell them what you did and what came of it. Never say you've done something you haven't actually done with your tools.`,

    `# Using your computer

- Prefer the shell and file tools; they're faster and more reliable than the desktop. Reach for the desktop when a task needs an app with a screen.
- Before you click or type, look at the screen with viewScreen, and look again afterwards to check it worked. Coordinates are pixels in that screenshot, from its top-left corner.
- When the person asks what's on your screen, or asks to see it, use showScreen so the screenshot appears in the chat.
- If something fails, read the error and try a different approach before giving up. If you can't finish, say what's in the way.`,

    `# How you work

Lead with the answer, then give whatever detail the person needs to act on it. Match their tone and the length of their message. Write in Markdown when structure helps, such as lists, code blocks or tables, and in plain sentences when it doesn't. If a request is unclear and a wrong guess would waste their time, ask one short question first. When something falls outside your job, help if you reasonably can and mention that it isn't what you're set up for.`,

    bot.instructions &&
      `# Instructions from the person you work for

${bot.instructions}`,
  ]
    .filter(Boolean)
    .join("\n\n")
}

// The bot that represents a chat. The server actions have already checked the
// chat belongs to the signed-in user, so this runs without Clerk.
async function getChatContext(chatId: string) {
  const member = await db.query.chatMembers.findFirst({
    where: (members, { eq }) => eq(members.chatId, chatId),
    // Direct chats have one bot; group chats fall back to the first to join
    orderBy: (members, { asc }) => [asc(members.joinedAt)],
    with: {
      bot: {
        columns: { name: true, job: true, instructions: true, sandboxId: true },
      },
      chat: { columns: { kind: true } },
    },
  })
  if (!member) throw new Error("Chat not found")
  return member
}

// Conversations persist in the default transcript storage, keyed by chatId
export const botChat = chat.withUIMessage<BotChatUIMessage>().agent({
  id: "bot-chat",
  // The prompt only changes when the bot is edited, so cache it across turns
  cacheControl: { type: "ephemeral" },
  // Each turn's tools work the computer that belongs to the chat's bot
  tools: async ({ chatId }) => {
    const { bot } = await getChatContext(chatId)
    return createComputerTools(bot.sandboxId)
  },
  // Rebuilt every turn, including continuation runs, so edits to the bot apply
  // from the next message
  onTurnStart: async ({ chatId }) => {
    const {
      bot,
      chat: { kind },
    } = await getChatContext(chatId)
    chat.prompt.set(systemPromptFor(bot, kind))
  },
  run: async ({ messages, tools, signal, streamText }) => {
    return streamText({
      model: anthropic("claude-sonnet-5-5"),
      messages,
      tools,
      // Working a desktop takes many look-act-look steps
      stopWhen: isStepCount(50),
      abortSignal: signal,
    })
  },
})
