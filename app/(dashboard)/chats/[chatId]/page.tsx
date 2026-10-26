import { notFound } from "next/navigation"
import { Suspense } from "react"

import { loadTranscript, mintChatAccessToken } from "@/actions/chats"
import { Chat, ChatSkeleton } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
import type { ChatHistory } from "@/components/chat-sessions"
import {
  ComputerPanel,
  ComputerPanelProvider,
} from "@/components/computer-panel"
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { getBots } from "@/queries/bots"
import { getChat } from "@/queries/chats"

// A chat with history already has a session; hydrate it so the transport can
// reconnect past what was saved instead of starting a new one
async function loadHistory(chatId: string): Promise<ChatHistory> {
  const [{ messages, cursors }, publicAccessToken] = await Promise.all([
    loadTranscript({ chatId }),
    mintChatAccessToken(chatId),
  ])
  if (messages.length === 0) return { messages }
  return {
    messages,
    session: { publicAccessToken, lastEventId: cursors?.lastOutEventId },
  }
}

export default async function Page(props: PageProps<"/chats/[chatId]">) {
  const { chatId } = await props.params
  const [chat, bots] = await Promise.all([getChat(chatId), getBots()])

  if (!chat) notFound()

  // Not awaited: a chat already open in this tab shows what it has straight
  // away, and only one opened for the first time waits for its history
  const history = loadHistory(chatId)

  const conversation = (
    <div className="flex h-full flex-col">
      <ChatHeader chat={chat} bots={bots} />
      <Suspense fallback={<ChatSkeleton />}>
        <Chat
          key={chat.id}
          id={chat.id}
          bots={chat.bots}
          group={chat.kind === "group"}
          history={history}
        />
      </Suspense>
    </div>
  )

  // Group chats have no single computer to show beside them
  if (chat.kind === "group") {
    return <div className="h-svh">{conversation}</div>
  }

  return (
    <ComputerPanelProvider key={chat.id} chatId={chat.id}>
      {/* The group sets an inline height: 100%, so the viewport height has to
          come from a parent for the chat to scroll inside it */}
      <div className="h-svh">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel minSize="30%">{conversation}</ResizablePanel>
          <ComputerPanel />
        </ResizablePanelGroup>
      </div>
    </ComputerPanelProvider>
  )
}
