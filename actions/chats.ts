"use server"

import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import {
  chat,
  defaultStorage,
  type ChatLoadTranscriptParams,
  type ChatStartSessionParams,
} from "@trigger.dev/sdk/ai"
import { and, eq, inArray, notInArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect, RedirectType } from "next/navigation"
import { z } from "zod"

import { getDesktopUrl } from "@/lib/daytona"
import { db } from "@/lib/db"
import {
  bots,
  chatMembers,
  chats,
  insertGroupChatSchema,
  type Chat,
} from "@/lib/db/schema"
import { getChat } from "@/queries/chats"
import type { BotChatUIMessage, botChat } from "@/trigger/chat"

type CreateGroupChatResult =
  { success: true; chat: Chat } | { success: false; error: string }

export async function createGroupChat(
  input: z.input<typeof insertGroupChatSchema>
): Promise<CreateGroupChatResult> {
  const { userId } = await auth.protect()

  const parsed = insertGroupChatSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: z.prettifyError(parsed.error) }
  }
  const { botIds, ...values } = parsed.data

  // Bot IDs come from the browser, so only the user's own bots may join
  const ownBots = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(inArray(bots.id, botIds), eq(bots.userId, userId)))
  if (ownBots.length !== new Set(botIds).size) {
    return { success: false, error: "Some of those bots don't exist." }
  }

  const chat = await db.transaction(async (tx) => {
    const [chat] = await tx
      .insert(chats)
      .values({ ...values, name: values.name || null, userId, kind: "group" })
      .returning()

    await tx
      .insert(chatMembers)
      .values(ownBots.map((bot) => ({ chatId: chat.id, botId: bot.id })))

    return chat
  })

  revalidatePath("/", "layout")

  return { success: true, chat }
}

type UpdateGroupChatResult =
  { success: true; chat: Chat } | { success: false; error: string }

export async function updateGroupChat(
  chatId: string,
  input: z.input<typeof insertGroupChatSchema>
): Promise<UpdateGroupChatResult> {
  const { userId } = await auth.protect()

  const parsed = insertGroupChatSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: z.prettifyError(parsed.error) }
  }
  const { botIds, ...values } = parsed.data

  // Bot IDs come from the browser, so only the user's own bots may join
  const ownBots = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(inArray(bots.id, botIds), eq(bots.userId, userId)))
  if (ownBots.length !== new Set(botIds).size) {
    return { success: false, error: "Some of those bots don't exist." }
  }

  const chat = await db.transaction(async (tx) => {
    // Scoping by userId and kind means someone else's chat, or a direct
    // chat, matches nothing
    const [chat] = await tx
      .update(chats)
      .set({ ...values, name: values.name || null })
      .where(
        and(
          eq(chats.id, chatId),
          eq(chats.userId, userId),
          eq(chats.kind, "group")
        )
      )
      .returning()
    if (!chat) return undefined

    const memberIds = ownBots.map((bot) => bot.id)
    await tx
      .delete(chatMembers)
      .where(
        and(
          eq(chatMembers.chatId, chat.id),
          notInArray(chatMembers.botId, memberIds)
        )
      )
    // Bots already in the group keep their place in the member order
    await tx
      .insert(chatMembers)
      .values(memberIds.map((botId) => ({ chatId: chat.id, botId })))
      .onConflictDoNothing()

    return chat
  })

  if (!chat) {
    return { success: false, error: "That group doesn't exist." }
  }

  revalidatePath("/", "layout")

  return { success: true, chat }
}

type DeleteGroupChatResult = { success: false; error: string }

export async function deleteGroupChat(
  chatId: string
): Promise<DeleteGroupChatResult> {
  const { userId } = await auth.protect()

  // Memberships cascade away; the bots themselves stay
  const [chat] = await db
    .delete(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.userId, userId),
        eq(chats.kind, "group")
      )
    )
    .returning()

  if (!chat) {
    return { success: false, error: "That group doesn't exist." }
  }

  revalidatePath("/", "layout")
  // The chat the group was deleted from no longer exists
  redirect("/chats", RedirectType.replace)
}

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
  return triggerAuth.createPublicToken({
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

// The desktop of a direct chat's bot, for the computer panel. Group chats
// have no single computer to show.
export async function getComputerUrl(chatId: string) {
  const chat = await getChat(chatId)
  if (!chat || chat.kind !== "direct") throw new Error("Chat not found")

  const bot = await db.query.bots.findFirst({
    where: (bots, { eq }) => eq(bots.id, chat.bots[0].id),
    columns: { sandboxId: true },
  })
  if (!bot) throw new Error("Bot not found")

  return getDesktopUrl(bot.sandboxId)
}
