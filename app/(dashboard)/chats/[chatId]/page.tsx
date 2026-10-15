import { notFound } from "next/navigation"

import { loadTranscript, mintChatAccessToken } from "@/actions/chats"
import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
import {
  ComputerPanel,
  ComputerPanelProvider,
} from "@/components/computer-panel"
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
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
    <ComputerPanelProvider key={chat.id} chatId={chat.id}>
      {/* The group sets an inline height: 100%, so the viewport height has to
          come from a parent for the chat to scroll inside it */}
      <div className="h-svh">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel minSize="30%">
            <div className="flex h-full flex-col">
              <ChatHeader chat={chat} />
              <Chat
                key={chat.id}
                id={chat.id}
                initialMessages={messages}
                session={session}
              />
            </div>
          </ResizablePanel>
          <ComputerPanel />
        </ResizablePanelGroup>
      </div>
    </ComputerPanelProvider>
  )
}
