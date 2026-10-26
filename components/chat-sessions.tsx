"use client"

import { Chat } from "@ai-sdk/react"
import type { ChatSessionPersistedState } from "@trigger.dev/sdk/chat"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import * as React from "react"

import { mintChatAccessToken, startChatSession } from "@/actions/chats"
import type { BotChatUIMessage, botChat } from "@/trigger/chat"

// What a chat starts from the first time it's opened. A chat with history
// carries its session, so the transport can resume an answer that was still
// streaming when the page loaded.
export type ChatHistory = {
  messages: BotChatUIMessage[]
  session?: ChatSessionPersistedState
}

type ChatSessions = {
  // The chat as this tab last left it, if it has been opened before
  find: (id: string) => Chat<BotChatUIMessage> | undefined
  open: (id: string, history: ChatHistory) => Chat<BotChatUIMessage>
  stop: (id: string) => void
}

const ChatSessionsContext = React.createContext<ChatSessions | null>(null)

export function useChatSessions() {
  const context = React.useContext(ChatSessionsContext)
  if (!context) {
    throw new Error("useChatSessions must be used within ChatSessionsProvider")
  }
  return context
}

// Every chat opened in this tab, kept for as long as the tab is. useChat stops
// a chat it made itself when its component unmounts, and the transport passes
// that stop on to the agent, so leaving a chat used to cut its bot off
// mid-task. A chat made here outlives the page, so its bot finishes the job
// and coming back shows where it's got to.
export function ChatSessionsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const transport = useTriggerChatTransport<typeof botChat>({
    task: "bot-chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
  })
  const [chats] = React.useState(
    () => new Map<string, Chat<BotChatUIMessage>>()
  )

  const sessions: ChatSessions = {
    find: (id) => chats.get(id),
    open: (id, { messages, session }) => {
      const existing = chats.get(id)
      if (existing) return existing

      if (session) transport.setSession(id, session)
      const chat = new Chat<BotChatUIMessage>({ id, messages, transport })
      chats.set(id, chat)
      return chat
    },
    // Aborting a resumed stream doesn't reach the agent, so stop it directly
    // too
    stop: (id) => {
      void chats.get(id)?.stop()
      void transport.stopGeneration(id)
    },
  }

  return <ChatSessionsContext value={sessions}>{children}</ChatSessionsContext>
}
