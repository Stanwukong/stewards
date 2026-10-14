"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect, RedirectType } from "next/navigation"
import { z } from "zod"

import { db } from "@/lib/db"
import {
  bots,
  chatMembers,
  chats,
  insertBotSchema,
  type Bot,
  type Chat,
} from "@/lib/db/schema"

type CreateBotResult =
  { success: true; bot: Bot; chat: Chat } | { success: false; error: string }

export async function createBot(
  input: z.input<typeof insertBotSchema>
): Promise<CreateBotResult> {
  const { userId } = await auth.protect()

  const parsed = insertBotSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: z.prettifyError(parsed.error) }
  }

  // Every bot starts with a direct chat, so create all three rows or none
  const { bot, chat } = await db.transaction(async (tx) => {
    const [bot] = await tx
      .insert(bots)
      .values({
        ...parsed.data,
        instructions: parsed.data.instructions || null,
        userId,
      })
      .returning()

    const [chat] = await tx
      .insert(chats)
      .values({ userId, kind: "direct" })
      .returning()

    await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })

    return { bot, chat }
  })

  revalidatePath("/")

  return { success: true, bot, chat }
}

type UpdateBotResult =
  { success: true; bot: Bot } | { success: false; error: string }

export async function updateBot(
  botId: string,
  input: z.input<typeof insertBotSchema>
): Promise<UpdateBotResult> {
  const { userId } = await auth.protect()

  const parsed = insertBotSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: z.prettifyError(parsed.error) }
  }

  // Scoping by userId means a bot that belongs to someone else matches nothing
  const [bot] = await db
    .update(bots)
    .set({
      ...parsed.data,
      instructions: parsed.data.instructions || null,
    })
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning()

  if (!bot) {
    return { success: false, error: "That bot doesn't exist." }
  }

  // The bot's name and face show in the sidebar and every chat it's in
  revalidatePath("/", "layout")

  return { success: true, bot }
}

type DeleteBotResult = { success: false; error: string }

export async function deleteBot(botId: string): Promise<DeleteBotResult> {
  const { userId } = await auth.protect()

  const bot = await db.transaction(async (tx) => {
    // Find the bot's direct chats first, since deleting the bot cascades
    // away the memberships that link them
    const directChats = await tx
      .select({ id: chats.id })
      .from(chats)
      .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
      .where(
        and(
          eq(chatMembers.botId, botId),
          eq(chats.kind, "direct"),
          eq(chats.userId, userId)
        )
      )

    const [bot] = await tx
      .delete(bots)
      .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
      .returning()

    // A direct chat without its bot is empty, so it goes too
    if (bot && directChats.length > 0) {
      await tx.delete(chats).where(
        inArray(
          chats.id,
          directChats.map((chat) => chat.id)
        )
      )
    }

    return bot
  })

  if (!bot) {
    return { success: false, error: "That bot doesn't exist." }
  }

  revalidatePath("/", "layout")
  // The chat the bot was deleted from no longer exists
  redirect("/", RedirectType.replace)
}
