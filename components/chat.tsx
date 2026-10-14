"use client"

import { useChat } from "@ai-sdk/react"
import type { ChatSessionPersistedState } from "@trigger.dev/sdk/chat"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import type { UIMessage } from "ai"

import { mintChatAccessToken, startChatSession } from "@/actions/chats"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import type { botChat } from "@/trigger/chat"

// A chat with history starts from its existing session, so the transport can
// resume an answer that was still streaming when the page loaded
export function Chat({
  id,
  initialMessages,
  session,
}: {
  id: string
  initialMessages: UIMessage[]
  session?: ChatSessionPersistedState
}) {
  const transport = useTriggerChatTransport<typeof botChat>({
    task: "bot-chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
    sessions: session && { [id]: session },
  })

  const {
    messages,
    sendMessage,
    status,
    stop: stopStream,
  } = useChat({
    id,
    messages: initialMessages,
    transport,
    resume: initialMessages.length > 0,
  })

  // Aborting a resumed stream doesn't reach the agent, so stop it directly too
  function stop() {
    stopStream()
    transport.stopGeneration(id)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part, i) =>
                  part.type === "text" ? (
                    <MessageResponse key={i}>{part.text}</MessageResponse>
                  ) : null
                )}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl p-4 pt-0">
        <PromptInput
          onSubmit={({ text }) => {
            if (text.trim()) sendMessage({ text })
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
