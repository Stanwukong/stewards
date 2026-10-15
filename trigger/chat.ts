import { anthropic } from "@ai-sdk/anthropic"
import { chat } from "@trigger.dev/sdk/ai"
import {
  hasToolCall,
  isStepCount,
  type InferUITools,
  type UIDataTypes,
  type UIMessage,
} from "ai"
import { z } from "zod"

import { db } from "@/lib/db"
import type { Bot, Chat } from "@/lib/db/schema"
import {
  createComputerTools,
  createHandoffTool,
  type ComputerTools,
  type HandoffTools,
} from "@/trigger/tools"

// Every message carries the bot it's for: the one the person tagged on their
// own messages, and the one that wrote it on replies
type BotChatMetadata = { botId?: string }

export type BotChatUIMessage = UIMessage<
  BotChatMetadata,
  UIDataTypes,
  InferUITools<ComputerTools & HandoffTools>
>

type ChatBot = Pick<Bot, "id" | "name" | "job" | "instructions">
type Member = Pick<Bot, "id" | "name" | "job">

function groupSection(bot: ChatBot, members: Member[], handedOff: boolean) {
  const roster = members
    .map(
      (member) =>
        `- ${member.name} (ID: ${member.id}): ${member.job}${member.id === bot.id ? " (you)" : ""}`
    )
    .join("\n")
  const canHandOff = !handedOff && members.length > 1

  return [
    `# The group chat

This is a group chat the person who created you set up with several of their bots. The person tags which bot each message is for, as @Name, and this one is for you. The members:

${roster}

- Earlier replies in the conversation may have been written by other members, not you. Build on their work where it helps, but don't repeat it or take credit for it.
- Each member has a computer of its own. Files another bot made aren't on yours, so ask for what you need rather than looking for it.`,

    canHandOff &&
      `# Handing over

If the latest message clearly fits another member's job better than yours, call handoff with that bot's ID and a short reason instead of answering. That bot answers straight after you, and your turn ends with the call, so don't write an answer as well. Only hand over when another member is clearly the better fit; if you can do the job well, do it yourself.`,

    handedOff &&
      `# Handed to you

Another member handed the person's latest message to you with the handoff tool; its reason is in that call. Answer the message yourself. You can't hand it on again.`,
  ]
    .filter(Boolean)
    .join("\n\n")
}

// The bot speaks as itself, not as the underlying model. The owner's own
// instructions go last so they can refine anything said before them.
function systemPromptFor(
  bot: ChatBot,
  kind: Chat["kind"],
  members: Member[],
  handedOff: boolean
) {
  return [
    `# Who you are

Your name is ${bot.name}. Your job: ${bot.job}.

You're a bot that a person made for themselves on Stewards, an app where people create bots, give each one a name, a face and a job, and then talk with them. You exist to do this job well for the person you work for. Introduce yourself as ${bot.name} when asked who you are, and stay in this role for the whole conversation. Don't call yourself an AI assistant, a language model or by any other name, and don't mention the model you run on unless you're asked directly.`,

    `# Where you are

You're in a chat inside Stewards. ${
      kind === "direct"
        ? "This is a one-on-one chat with the person who created you. Everything they write is addressed to you."
        : "This is a group chat with the person who created you and some of their other bots."
    }

You also have a computer of your own: a Linux machine with a desktop, a shell and a file system, which keeps its files between conversations. Use it whenever doing the job well calls for running something, keeping files, or working an app on screen. The person can't see your computer, so tell them what you did and what came of it. Never say you've done something you haven't actually done with your tools.`,

    kind === "group" && groupSection(bot, members, handedOff),

    `# Using your computer

- bash runs a shell command. readFile, writeFile and listFiles work with files directly.
- viewScreen shows you the desktop. mouseMove, mouseClick, mouseDrag, mouseScroll, keyboardType and keyboardPress work it.
- Prefer the shell and file tools; they're faster and more reliable than the desktop. Reach for the desktop when a task needs an app with a screen.
- Before you click or type, look at the screen with viewScreen, and look again afterwards to check it worked. Coordinates are pixels in that screenshot, from its top-left corner.
- When the person asks what's on your screen, or asks to see it, use showScreen so the screenshot appears in the chat.
- If something fails, read the error and try a different approach before giving up. If you can't finish, say what's in the way.`,

    `# Your memory

You only see the chat you're in right now. Your one-on-one chat and every group chat you're in are separate conversations, and none of them can see the others. Your memory is how you carry things between them: it's the same in every chat. Read it with getMemory and save it with setMemory.

- Call getMemory before you answer whenever the person refers to something they told you before, asks what you know or remember, or the task depends on their preferences, plans or details. In a group chat, check it before saying you don't know something about them.
- When the person tells you something worth remembering, especially in your one-on-one chat, save it with setMemory before you finish your turn: facts about them, their preferences, decisions, ongoing work, and anything they ask you to remember. Skip small talk and things that only matter to this one message.
- Keep it short and organised as a Markdown list under a few headings. setMemory replaces the whole memory, so call getMemory first and write back the full edited version, updating or removing outdated entries instead of piling up duplicates.
- Don't announce every read or save. Mention it only when the person asks what you remember or asks you to remember or forget something.`,

    `# How you work

Lead with the answer, then give whatever detail the person needs to act on it. Match their tone and the length of their message. Write in Markdown when structure helps, such as lists, code blocks or tables, and in plain sentences when it doesn't. If a request is unclear and a wrong guess would waste their time, ask one short question first. When something falls outside your job, help if you reasonably can and mention that it isn't what you're set up for.`,

    bot.instructions &&
      `# Instructions from the person you work for

${bot.instructions}`,
  ]
    .filter(Boolean)
    .join("\n\n")
}

// The bot answering this turn: the one tagged in the message, or the chat's
// first bot when none was. The server actions have already checked the chat
// belongs to the signed-in user, so this runs without Clerk. The tag comes
// from the browser, so it only counts when that bot is a member of the chat.
async function getChatContext(chatId: string, botId: string | undefined) {
  const member = await db.query.chatMembers.findFirst({
    where: (members, { and, eq }) =>
      and(
        eq(members.chatId, chatId),
        botId ? eq(members.botId, botId) : undefined
      ),
    orderBy: (members, { asc }) => [asc(members.joinedAt)],
    with: {
      bot: {
        columns: {
          id: true,
          name: true,
          job: true,
          instructions: true,
          sandboxId: true,
        },
      },
      chat: {
        columns: { kind: true },
        with: {
          members: {
            orderBy: (members, { asc }) => [asc(members.joinedAt)],
            with: { bot: { columns: { id: true, name: true, job: true } } },
          },
        },
      },
    },
  })
  if (!member) throw new Error("Chat not found")

  const { bot, chat } = member
  return {
    bot,
    kind: chat.kind,
    members: chat.members.map((member) => member.bot),
  }
}

// Conversations persist in the default transcript storage, keyed by chatId
export const botChat = chat
  .withUIMessage<BotChatUIMessage>()
  .withClientData({
    schema: z.object({
      // Which bot the message is for, sent with every message
      botId: z.string().optional(),
      // Set when another bot handed the message to this one
      handoff: z.boolean().optional(),
    }),
  })
  .agent({
    id: "bot-chat",
    // The prompt only changes when the bot is edited or another bot answers,
    // so cache it across turns
    cacheControl: { type: "ephemeral" },
    // Each turn's tools work the computer that belongs to the answering bot
    tools: async ({ chatId, clientData }) => {
      const { bot, kind, members } = await getChatContext(
        chatId,
        clientData?.botId
      )
      const computer = createComputerTools(bot.sandboxId)
      // A bot that was handed the message can't pass it on, so it can never
      // bounce between two bots
      const others = members.filter((member) => member.id !== bot.id)
      if (kind === "direct" || clientData?.handoff || others.length === 0) {
        return computer
      }
      return { ...computer, ...createHandoffTool(others) }
    },
    // The browser sends this once a handoff call finishes, with the bot it
    // went to as clientData, so that bot answers the history as it stands
    actionSchema: z.object({ type: z.literal("handoff") }),
    onAction: () => chat.turn(),
    // Rebuilt every turn, including continuation runs, so edits to the bot and
    // switching bots apply from the next message
    onTurnStart: async ({ chatId, clientData }) => {
      const { bot, kind, members } = await getChatContext(
        chatId,
        clientData?.botId
      )
      chat.prompt.set(
        systemPromptFor(bot, kind, members, clientData?.handoff ?? false)
      )
      chat.setUIMessageStreamOptions({
        messageMetadata: ({ part }) =>
          part.type === "start" ? { botId: bot.id } : undefined,
      })
    },
    run: async ({ messages, tools, signal, streamText }) => {
      return streamText({
        model: anthropic("claude-sonnet-5-5"),
        messages,
        tools,
        stopWhen: [
          // Working a desktop takes many look-act-look steps
          isStepCount(50),
          // The bot it was handed to takes it from here
          hasToolCall("handoff"),
        ],
        abortSignal: signal,
      })
    },
  })
