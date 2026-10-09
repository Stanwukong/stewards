"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/lib/db"
import { bots, insertBotSchema, type Bot } from "@/lib/db/schema"

type CreateBotResult =
  { success: true; bot: Bot } | { success: false; error: string }

export async function createBot(
  input: z.input<typeof insertBotSchema>
): Promise<CreateBotResult> {
  const { userId } = await auth.protect()

  const parsed = insertBotSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: z.prettifyError(parsed.error) }
  }

  const [bot] = await db
    .insert(bots)
    .values({
      ...parsed.data,
      instructions: parsed.data.instructions || null,
      userId,
    })
    .returning()

  revalidatePath("/")

  return { success: true, bot }
}
