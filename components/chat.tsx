"use client"

import { useChat } from "@ai-sdk/react"
import type { ChatSessionPersistedState } from "@trigger.dev/sdk/chat"
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import {
  CircleAlertIcon,
  EyeIcon,
  FileIcon,
  FolderIcon,
  KeyboardIcon,
  MonitorIcon,
  GrabIcon,
  MousePointer2Icon,
  MousePointerClickIcon,
  PaperclipIcon,
  ScrollIcon,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { bundledLanguages, type BundledLanguage } from "shiki"

import { mintChatAccessToken, startChatSession } from "@/actions/chats"
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments"
import { CodeBlock } from "@/components/ai-elements/code-block"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Image } from "@/components/ai-elements/image"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { Terminal } from "@/components/ai-elements/terminal"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
} from "@/components/ai-elements/tool"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import type { BotChatUIMessage, botChat } from "@/trigger/chat"

type Part = BotChatUIMessage["parts"][number]
type ToolPart = Extract<Part, { type: `tool-${string}` }>
type ToolPartOf<T extends ToolPart["type"]> = Extract<ToolPart, { type: T }>

function isToolPart(part: Part): part is ToolPart {
  return part.type.startsWith("tool-")
}

function isRunning(part: ToolPart) {
  return part.state === "input-streaming" || part.state === "input-available"
}

// Mouse, keyboard and looking at the screen happen in long runs of small
// steps, so each is one quiet line rather than a card
function ActionRow({
  part,
  icon,
  children,
}: {
  part: ToolPart
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
      {isRunning(part) ? <Spinner /> : icon}
      <span className="min-w-0 truncate">{children}</span>
      {part.state === "output-error" && (
        <span className="flex items-center gap-1 text-destructive">
          <CircleAlertIcon />
          {part.errorText}
        </span>
      )}
    </div>
  )
}

// Highlight by extension; anything unknown falls back to plain text
function languageOf(path: string | undefined) {
  const extension = path?.split(".").pop() ?? ""
  return (extension in bundledLanguages ? extension : "log") as BundledLanguage
}

function at(x: number | undefined, y: number | undefined, preposition = "at") {
  return x === undefined ? "" : ` ${preposition} (${x}, ${y})`
}

function BashCall({ part }: { part: ToolPartOf<"tool-bash"> }) {
  const command = part.input?.command ?? ""
  const output = part.state === "output-available" ? part.output : undefined
  const failed = output !== undefined && output.exitCode !== 0

  return (
    <Tool defaultOpen={failed || part.state === "output-error"}>
      <ToolHeader
        type={part.type}
        state={part.state}
        title={command || "Running a command"}
      />
      <ToolContent>
        <Terminal
          className="max-h-80"
          isStreaming={isRunning(part)}
          output={[
            `$ ${command}`,
            output?.output,
            failed && `exit code ${output.exitCode}`,
          ]
            .filter(Boolean)
            .join("\n")}
        />
        {part.state === "output-error" && (
          <ToolOutput output={undefined} errorText={part.errorText} />
        )}
      </ToolContent>
    </Tool>
  )
}

function FileCall({
  part,
  title,
  children,
}: {
  part: ToolPart
  title: string
  children?: ReactNode
}) {
  return (
    <Tool>
      <ToolHeader type={part.type} state={part.state} title={title} />
      <ToolContent>
        {children}
        {part.state === "output-error" && (
          <ToolOutput output={undefined} errorText={part.errorText} />
        )}
      </ToolContent>
    </Tool>
  )
}

// The one screenshot the person sees; viewScreen's stay with the bot
function ShowScreenCall({ part }: { part: ToolPartOf<"tool-showScreen"> }) {
  if (part.state === "output-available") {
    return (
      <Image
        alt="The bot's screen"
        base64={part.output.base64}
        mediaType={part.output.mediaType}
        uint8Array={new Uint8Array()}
        className="w-full border"
      />
    )
  }
  if (part.state === "output-error") {
    return (
      <ActionRow part={part} icon={<MonitorIcon />}>
        Couldn&apos;t capture the screen
      </ActionRow>
    )
  }
  return <Skeleton className="aspect-4/3 w-full rounded-md" />
}

function ToolCall({ part }: { part: ToolPart }) {
  switch (part.type) {
    case "tool-bash":
      return <BashCall part={part} />

    case "tool-readFile":
      return (
        <FileCall part={part} title={`Read ${part.input?.path ?? "a file"}`}>
          {part.state === "output-available" && (
            <CodeBlock
              code={part.output.content}
              language={languageOf(part.input?.path)}
            />
          )}
        </FileCall>
      )

    case "tool-writeFile":
      return (
        <FileCall part={part} title={`Wrote ${part.input?.path ?? "a file"}`}>
          {part.input?.content !== undefined && (
            <CodeBlock
              code={part.input.content}
              language={languageOf(part.input.path)}
            />
          )}
        </FileCall>
      )

    case "tool-listFiles":
      return (
        <FileCall
          part={part}
          title={`Listed ${part.input?.path ?? "a folder"}`}
        >
          {part.state === "output-available" && (
            <ul className="space-y-1 text-sm">
              {part.output.entries.length === 0 && (
                <li className="text-muted-foreground">Empty folder</li>
              )}
              {part.output.entries.map((entry) => (
                <li
                  key={entry.name}
                  className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:text-muted-foreground"
                >
                  {entry.isDir ? <FolderIcon /> : <FileIcon />}
                  {entry.name}
                </li>
              ))}
            </ul>
          )}
        </FileCall>
      )

    case "tool-mouseClick":
      return (
        <ActionRow part={part} icon={<MousePointerClickIcon />}>
          {part.input?.double ? "Double-clicked" : "Clicked"}
          {part.input?.button && part.input.button !== "left"
            ? ` ${part.input.button}`
            : ""}
          {at(part.input?.x, part.input?.y)}
        </ActionRow>
      )

    case "tool-mouseDrag":
      return (
        <ActionRow part={part} icon={<GrabIcon />}>
          Dragged
          {at(part.input?.fromX, part.input?.fromY, "from")}
          {at(part.input?.toX, part.input?.toY, "to")}
        </ActionRow>
      )

    case "tool-mouseMove":
      return (
        <ActionRow part={part} icon={<MousePointer2Icon />}>
          Moved the mouse{at(part.input?.x, part.input?.y)}
        </ActionRow>
      )

    case "tool-mouseScroll":
      return (
        <ActionRow part={part} icon={<ScrollIcon />}>
          Scrolled {part.input?.direction ?? ""}
          {at(part.input?.x, part.input?.y)}
        </ActionRow>
      )

    case "tool-keyboardType":
      return (
        <ActionRow part={part} icon={<KeyboardIcon />}>
          Typed{" "}
          <span className="text-foreground">
            &ldquo;{part.input?.text ?? ""}&rdquo;
          </span>
        </ActionRow>
      )

    case "tool-keyboardPress":
      return (
        <ActionRow part={part} icon={<KeyboardIcon />}>
          <span className="inline-flex items-center gap-2">
            Pressed
            <KbdGroup>
              {[...(part.input?.modifiers ?? []), part.input?.key]
                .filter(Boolean)
                .map((key, i) => (
                  <Kbd key={i}>{key}</Kbd>
                ))}
            </KbdGroup>
          </span>
        </ActionRow>
      )

    case "tool-viewScreen":
      return (
        <ActionRow part={part} icon={<EyeIcon />}>
          Looked at the screen
        </ActionRow>
      )

    case "tool-showScreen":
      return <ShowScreenCall part={part} />
  }
}

// A message reaches the agent as one record capped at about 1 MiB, and files
// travel inside it as base64, which is a third bigger than the file itself
const MAX_ATTACHMENTS_SIZE = 700 * 1024

// Files the model can read
const ACCEPTED_FILES = "image/*,application/pdf"

type ChatBot = { id: string; name: string; avatar: string }

function ComposerAttachments() {
  const attachments = usePromptInputAttachments()

  if (attachments.files.length === 0) return null

  return (
    <PromptInputHeader>
      <Attachments variant="inline">
        {attachments.files.map((file) => (
          <Attachment
            key={file.id}
            data={file}
            onRemove={() => attachments.remove(file.id)}
          >
            <AttachmentPreview />
            <AttachmentRemove />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  )
}

function AttachButton() {
  const attachments = usePromptInputAttachments()

  return (
    <PromptInputButton
      tooltip="Attach files"
      onClick={() => attachments.openFileDialog()}
    >
      <PaperclipIcon />
      <span className="sr-only">Attach files</span>
    </PromptInputButton>
  )
}

function BotSelect({
  bots,
  value,
  onValueChange,
}: {
  bots: ChatBot[]
  value: ChatBot
  onValueChange: (botId: string) => void
}) {
  return (
    <PromptInputSelect
      value={value.id}
      onValueChange={(botId) => {
        if (typeof botId === "string") onValueChange(botId)
      }}
    >
      <PromptInputSelectTrigger size="sm" aria-label="Bot to talk to">
        <PromptInputSelectValue>
          <ChatAvatar seed={value.avatar} className="size-4" />
          {value.name}
        </PromptInputSelectValue>
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        {bots.map((bot) => (
          <PromptInputSelectItem key={bot.id} value={bot.id}>
            <ChatAvatar seed={bot.avatar} className="size-4" />
            {bot.name}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  )
}

// A chat with history starts from its existing session, so the transport can
// resume an answer that was still streaming when the page loaded
export function Chat({
  id,
  bots,
  group,
  initialMessages,
  session,
}: {
  id: string
  // The chat's bots, in the order they joined
  bots: ChatBot[]
  group: boolean
  initialMessages: BotChatUIMessage[]
  session?: ChatSessionPersistedState
}) {
  // Carry on with whoever answered last
  const [botId, setBotId] = useState(
    () =>
      initialMessages.findLast((message) => message.metadata?.botId)?.metadata
        ?.botId
  )
  // The picked bot may have left the chat since, so fall back to the first
  const bot = bots.find((bot) => bot.id === botId) ?? bots[0]

  const transport = useTriggerChatTransport<typeof botChat>({
    task: "bot-chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
    sessions: session && { [id]: session },
    // Sent with every message, so the agent answers as the picked bot
    clientData: { botId: bot.id },
  })

  const {
    messages,
    sendMessage,
    status,
    stop: stopStream,
  } = useChat<BotChatUIMessage>({
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

  function handleSubmit({ text, files }: PromptInputMessage) {
    if (!text.trim() && files.length === 0) return

    const size = files.reduce((total, file) => total + file.url.length, 0)
    if (size > (MAX_ATTACHMENTS_SIZE * 4) / 3) {
      toast.add({
        title: "Files are too big",
        description: "Attach up to 700 KB of files per message.",
        type: "error",
      })
      // PromptInput keeps the text and files when submitting throws
      throw new Error("Attachments too large")
    }

    sendMessage({ text, files })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.map((message) => {
            const author =
              group && message.role === "assistant"
                ? bots.find((bot) => bot.id === message.metadata?.botId)
                : undefined
            const files = message.parts.flatMap((part, i) =>
              part.type === "file"
                ? [{ ...part, id: `${message.id}-${i}` }]
                : []
            )

            return (
              <Message from={message.role} key={message.id}>
                {author && (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ChatAvatar seed={author.avatar} className="size-5" />
                    {author.name}
                  </div>
                )}
                {files.length > 0 && (
                  <Attachments>
                    {files.map((file) => (
                      <Attachment key={file.id} data={file}>
                        <AttachmentPreview />
                      </Attachment>
                    ))}
                  </Attachments>
                )}
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      )
                    }
                    if (isToolPart(part)) {
                      return <ToolCall key={part.toolCallId} part={part} />
                    }
                    return null
                  })}
                </MessageContent>
              </Message>
            )
          })}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl p-4 pt-0">
        <PromptInput
          accept={ACCEPTED_FILES}
          multiple
          maxFileSize={MAX_ATTACHMENTS_SIZE}
          onError={({ message }) =>
            toast.add({
              title: "Couldn't attach that file",
              description: message,
              type: "error",
            })
          }
          onSubmit={handleSubmit}
        >
          <ComposerAttachments />
          <PromptInputBody>
            <PromptInputTextarea placeholder={`Message ${bot.name}`} />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <AttachButton />
              <BotSelect bots={bots} value={bot} onValueChange={setBotId} />
            </PromptInputTools>
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
