"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect, RedirectType } from "next/navigation"
import { z } from "zod"

import { createBotSandbox, deleteBotSandbox } from "@/lib/daytona"
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

  let sandboxId: string
  try {
    sandboxId = await createBotSandbox(userId)
  } catch (error) {
    console.error("Failed to create bot sandbox", error)
    return { success: false, error: "Couldn't set up your bot. Try again." }
  }

  // Every bot starts with a direct chat, so create all three rows or none
  let result: { bot: Bot; chat: Chat }
  try {
    result = await db.transaction(async (tx) => {
      const [bot] = await tx
        .insert(bots)
        .values({
          ...parsed.data,
          instructions: parsed.data.instructions || null,
          userId,
          sandboxId,
        })
        .returning()

      const [chat] = await tx
        .insert(chats)
        .values({ userId, kind: "direct" })
        .returning()

      await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id })

      return { bot, chat }
    })
  } catch (error) {
    // No bot owns the sandbox now, so don't leave it running up a bill
    await deleteBotSandbox(sandboxId).catch((cleanupError) =>
      console.error("Failed to delete orphaned sandbox", cleanupError)
    )
    throw error
  }
  const { bot, chat } = result

  revalidatePath("/chats")

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

  // The bot is already gone, so a failure here only orphans the sandbox
  try {
    await deleteBotSandbox(bot.sandboxId)
  } catch (error) {
    console.error(`Failed to delete sandbox ${bot.sandboxId}`, error)
  }

  revalidatePath("/", "layout")
  // The chat the bot was deleted from no longer exists
  redirect("/chats", RedirectType.replace)
}
