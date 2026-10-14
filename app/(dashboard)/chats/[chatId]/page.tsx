import { notFound } from "next/navigation"

import { loadTranscript, mintChatAccessToken } from "@/actions/chats"
import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
import { getChat } from "@/queries/chats"

export default async function Page(props: PageProps<"/chats/[chatId]">) {
  const { chatId } = await props.params
  const chat = await getChat(chatId)

  if (!chat) notFound()

  const { messages, cursors } = await loadTranscript({ chatId })
  // A chat with history already has a session; hydrate it so the transport
  // can reconnect past what was saved instead of starting a new one
  const session =
    messages.length > 0
      ? {
          publicAccessToken: await mintChatAccessToken(chatId),
          lastEventId: cursors?.lastOutEventId,
        }
      : undefined

  return (
    <div className="flex h-svh flex-col">
      <ChatHeader chat={chat} />
      <Chat
        key={chat.id}
        id={chat.id}
        initialMessages={messages}
        session={session}
      />
    </div>
  )
}
