"use server"

import { auth } from "@trigger.dev/sdk"
import {
  chat,
  defaultStorage,
  type ChatLoadTranscriptParams,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai"

import { getChat } from "@/queries/chats"
import type { botChat } from "@/trigger/chat"

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
  return load(params)
}
