"use server"

import { auth } from "@trigger.dev/sdk"
import {
  chat,
  defaultStorage,
  type ChatLoadTranscriptParams,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai"

import { getDesktopUrl } from "@/lib/daytona"
import { db } from "@/lib/db"
import { getChat } from "@/queries/chats"
import type { BotChatUIMessage, botChat } from "@/trigger/chat"

// chatId comes from the browser, so every action checks it belongs to the
// signed-in user before touching the session
async function assertOwnsChat(chatId: string) {
  if (!(await getChat(chatId))) throw new Error("Chat not found")
}

const start = chat.createStartSessionAction<typeof botChat>("bot-chat")

// Creates the session and its first run. Idempotent on chatId.
export async function startChatSession(
  params: ChatStartSessionParams<typeof botChat>
) {
  await assertOwnsChat(params.chatId)
  return start(params)
}

// The transport calls this to refresh an expired token
export async function mintChatAccessToken(chatId: string) {
  await assertOwnsChat(chatId)
  return auth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  })
}

const load = chat.createLoadTranscriptAction(defaultStorage)

export async function loadTranscript(params: ChatLoadTranscriptParams) {
  await assertOwnsChat(params.chatId)
  const transcript = await load(params)
  // Storage is untyped, but everything in it was written by botChat
  return {
    ...transcript,
    messages: transcript.messages as BotChatUIMessage[],
  }
}

// The desktop of the chat's bot, for the computer panel
export async function getComputerUrl(chatId: string) {
  const chat = await getChat(chatId)
  if (!chat) throw new Error("Chat not found")

  const bot = await db.query.bots.findFirst({
    where: (bots, { eq }) => eq(bots.id, chat.bot.id),
    columns: { sandboxId: true },
  })
  if (!bot) throw new Error("Bot not found")

  return getDesktopUrl(bot.sandboxId)
}
