"use client"

import { useChat } from "@ai-sdk/react"
import { type ChatStatus } from "ai"
import {
  ArrowRightLeftIcon,
  BrainIcon,
  CircleAlertIcon,
  ClockAlertIcon,
  EyeIcon,
  FileIcon,
  FolderIcon,
  KeyboardIcon,
  MonitorIcon,
  GrabIcon,
  MousePointer2Icon,
  MousePointerClickIcon,
  PaperclipIcon,
  RotateCcwIcon,
  ScrollIcon,
} from "lucide-react"
import {
  use,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { bundledLanguages, type BundledLanguage } from "shiki"

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
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
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
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { Terminal } from "@/components/ai-elements/terminal"
import { BotBadge } from "@/components/bot-badge"
import { ChatAvatar } from "@/components/chat-avatar"
import { useChatSessions, type ChatHistory } from "@/components/chat-sessions"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { WorkingIndicator } from "@/components/working-indicator"
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
import { findMentions, MENTION_QUERY } from "@/lib/mentions"
import type { BotChatUIMessage } from "@/trigger/chat"

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
        // Commands often span lines; the full one is in the terminal below
        title={command.replace(/\s+/g, " ").trim() || "Running a command"}
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

    case "tool-getMemory":
      return (
        <ActionRow part={part} icon={<BrainIcon />}>
          Checked its memory
        </ActionRow>
      )

    case "tool-setMemory":
      return (
        <FileCall part={part} title="Updated its memory">
          {part.input?.content !== undefined && (
            <CodeBlock code={part.input.content} language="md" />
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

    case "tool-handoff":
      return (
        <ActionRow part={part} icon={<ArrowRightLeftIcon />}>
          {part.state === "output-available"
            ? `${part.output.from} handed this to ${part.output.name}: ${part.output.reason}`
            : "Handing over"}
        </ActionRow>
      )
  }
}

// A message reaches the agent as one record capped at about 1 MiB, and files
// travel inside it as base64, which is a third bigger than the file itself
const MAX_ATTACHMENTS_SIZE = 700 * 1024

// How long a reply can go quiet before the person is told it may have
// stalled. A running tool can take a while on its own (bash waits up to 10
// minutes), and a message with no reply at all should have been picked up by
// a resume well within a few seconds of the chat opening.
const QUIET_LIMIT = 90_000
const TOOL_LIMIT = 11 * 60_000
const UNANSWERED_LIMIT = 5_000

// Files the model can read
const ACCEPTED_FILES = "image/*,application/pdf"

type ChatBot = { id: string; name: string; avatar: string; job: string }

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

// What the person wrote in a group chat, with each tagged bot as a badge. A
// message sent without a tag went to whoever spoke last, so that bot leads it.
function UserText({
  text,
  bots,
  botId,
  lead,
}: {
  text: string
  bots: ChatBot[]
  botId: string | undefined
  lead: boolean
}) {
  const mentions = findMentions(text, bots, botId)
  const recipient = bots.find((bot) => bot.id === botId)
  const untagged =
    lead && recipient && !mentions.some((mention) => mention.bot === recipient)

  const pieces: ReactNode[] = []
  let from = 0
  for (const mention of mentions) {
    pieces.push(text.slice(from, mention.index))
    pieces.push(<BotBadge key={mention.index} bot={mention.bot} />)
    from = mention.index + mention.length
  }
  pieces.push(text.slice(from))

  return (
    <p className="whitespace-pre-wrap">
      {untagged && <BotBadge bot={recipient} className="mr-1" />}
      {pieces}
    </p>
  )
}

// The prompt input, plus a list of the chat's bots that opens on "@" so the
// person can tag who the message is for
function Composer({
  bots,
  defaultBot,
  status,
  onStop,
  onSend,
}: {
  bots: ChatBot[]
  // Who gets a message that tags nobody
  defaultBot: ChatBot
  status: ChatStatus
  onStop: () => void
  onSend: (message: PromptInputMessage, botId: string) => void
}) {
  const { textInput } = usePromptInputController()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listId = useId()
  // The "@query" being typed, as a range of the text
  const [mention, setMention] = useState<{
    start: number
    end: number
    query: string
  } | null>(null)
  const [active, setActive] = useState(0)
  // The last bot picked from the list, which wins when two bots share a name
  const picked = useRef<string | undefined>(undefined)

  const query = mention?.query.toLowerCase()
  const options =
    query === undefined
      ? []
      : bots.filter((bot) => bot.name.toLowerCase().includes(query))
  const activeIndex = Math.min(active, options.length - 1)
  const open = options.length > 0

  function trackMention(textarea: HTMLTextAreaElement) {
    const caret = textarea.selectionStart
    const match =
      caret === textarea.selectionEnd
        ? MENTION_QUERY.exec(textarea.value.slice(0, caret))
        : null
    if (!match) {
      setMention(null)
      return
    }
    if (match[1] !== mention?.query) setActive(0)
    setMention({
      start: caret - match[1].length - 1,
      end: caret,
      query: match[1],
    })
  }

  function pick(bot: ChatBot) {
    if (!mention) return
    const tag = `@${bot.name} `
    const value = textInput.value
    textInput.setInput(
      value.slice(0, mention.start) + tag + value.slice(mention.end)
    )
    picked.current = bot.id
    setMention(null)

    // Put the caret after the tag once the new text has rendered
    const caret = mention.start + tag.length
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(caret, caret)
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      setActive((activeIndex + step + options.length) % options.length)
    } else if (event.key === "Enter" || event.key === "Tab") {
      // Picking from the list takes Enter, so it doesn't send the message
      event.preventDefault()
      pick(options[activeIndex])
    } else if (event.key === "Escape") {
      event.preventDefault()
      setMention(null)
    }
  }

  function handleSubmit(message: PromptInputMessage) {
    const tagged = findMentions(message.text, bots, picked.current)[0]?.bot
    onSend(message, (tagged ?? defaultBot).id)
    picked.current = undefined
  }

  return (
    <div className="relative">
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Bots"
          className="absolute bottom-full left-0 z-10 mb-2 w-72 max-w-full rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {options.map((bot, i) => (
            <div
              key={bot.id}
              id={`${listId}-${bot.id}`}
              role="option"
              aria-selected={i === activeIndex}
              // Keep focus in the textarea, so typing carries on after a pick
              onMouseDown={(event) => {
                event.preventDefault()
                pick(bot)
              }}
              onMouseMove={() => setActive(i)}
              className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
            >
              <ChatAvatar seed={bot.avatar} className="size-5" />
              <span className="max-w-32 shrink-0 truncate font-medium">
                {bot.name}
              </span>
              <span className="truncate text-muted-foreground">{bot.job}</span>
            </div>
          ))}
        </div>
      )}
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
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={
              bots.length > 1
                ? `Message ${defaultBot.name}, or type @ to tag another bot`
                : `Message ${defaultBot.name}`
            }
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={
              open ? `${listId}-${options[activeIndex].id}` : undefined
            }
            onChange={(event) => trackMention(event.currentTarget)}
            onSelect={(event) => trackMention(event.currentTarget)}
            onBlur={() => setMention(null)}
            onKeyDown={handleKeyDown}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <AttachButton />
          </PromptInputTools>
          <PromptInputSubmit status={status} onStop={onStop} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}

// The conversation while a chat's history is on its way, which only a chat
// opened for the first time in this tab waits for
export function ChatSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end gap-6 p-4">
        <Skeleton className="ml-auto h-10 w-2/5 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl p-4 pt-0">
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function Chat({
  id,
  bots,
  group,
  history,
}: {
  id: string
  // The chat's bots, in the order they joined
  bots: ChatBot[]
  group: boolean
  history: Promise<ChatHistory>
}) {
  const sessions = useChatSessions()
  // A chat opened before in this tab carries on from where it is, still
  // streaming if a bot is working, so only a first visit waits for history
  const chat = sessions.find(id) ?? sessions.open(id, use(history))

  const { messages, sendMessage, regenerate, status, error } =
    useChat<BotChatUIMessage>({
      chat,
      resume: chat.messages.length > 0,
    })

  // Carry on with whoever was talked to last. That bot may have left the chat
  // since, so fall back to the first.
  const lastBotId = messages.findLast((message) => message.metadata?.botId)
    ?.metadata?.botId
  const defaultBot = bots.find((bot) => bot.id === lastBotId) ?? bots[0]
  // The bot the latest message went to, which a retry goes to again
  const askedId = messages.findLast((message) => message.role === "user")
    ?.metadata?.botId
  const asked = bots.find((bot) => bot.id === askedId) ?? defaultBot

  const busy = status === "submitted" || status === "streaming"
  const last = messages.at(-1)
  const lastPart = last?.role === "assistant" ? last.parts.at(-1) : undefined
  const toolRunning =
    lastPart !== undefined && isToolPart(lastPart) && isRunning(lastPart)
  // A message nobody is answering, as when the bot's run died before it could
  const unanswered = status === "ready" && last?.role === "user"

  // The chat as it was when it went quiet for too long. It counts as stalled
  // until anything arrives or the status moves on.
  const [quiet, setQuiet] = useState<{
    messages: BotChatUIMessage[]
    status: typeof status
  } | null>(null)
  useEffect(() => {
    if (!busy && !unanswered) return
    const limit = unanswered
      ? UNANSWERED_LIMIT
      : toolRunning
        ? TOOL_LIMIT
        : QUIET_LIMIT
    const timer = setTimeout(() => setQuiet({ messages, status }), limit)
    return () => clearTimeout(timer)
  }, [busy, unanswered, toolRunning, messages, status])
  const stalled =
    (busy || unanswered) &&
    quiet?.messages === messages &&
    quiet.status === status

  async function retry() {
    if (busy) await sessions.stop(id)
    await regenerate({ metadata: { botId: asked.id } })
  }

  function send({ text, files }: PromptInputMessage, botId: string) {
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

    // On the message so it shows who it was for, and as transport metadata
    // so that bot answers it
    sendMessage({ text, files, metadata: { botId } }, { metadata: { botId } })
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
            const firstText = message.parts.findIndex(
              (part) => part.type === "text"
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
                      return group && message.role === "user" ? (
                        <UserText
                          key={i}
                          text={part.text}
                          bots={bots}
                          botId={message.metadata?.botId}
                          lead={i === firstText}
                        />
                      ) : (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      )
                    }
                    // Summaries of the model's thinking. Some carry only a
                    // signature for the model and no text.
                    if (part.type === "reasoning" && part.text.trim()) {
                      return (
                        <Reasoning
                          key={i}
                          isStreaming={part.state === "streaming"}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
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
          {busy && !stalled && <WorkingIndicator className="my-1" />}
          {status === "error" && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>{asked.name} couldn&apos;t answer</AlertTitle>
              <AlertDescription>
                {error?.message || "Something went wrong."}
              </AlertDescription>
              <AlertAction>
                <Button size="sm" variant="outline" onClick={retry}>
                  <RotateCcwIcon data-icon="inline-start" />
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          )}
          {stalled && (
            <Alert>
              <ClockAlertIcon />
              <AlertTitle>
                {busy
                  ? `No word from ${asked.name} in a while`
                  : `${asked.name} didn't reply`}
              </AlertTitle>
              <AlertDescription>
                {busy
                  ? "It may have stalled. Keep waiting, or stop it and try again."
                  : "Something went wrong before it could answer."}
              </AlertDescription>
              <AlertAction>
                <Button size="sm" variant="outline" onClick={retry}>
                  <RotateCcwIcon data-icon="inline-start" />
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl p-4 pt-0">
        <PromptInputProvider>
          <Composer
            bots={bots}
            defaultBot={defaultBot}
            // The error is shown in the conversation, so the button goes back
            // to sending
            status={status === "error" ? "ready" : status}
            onStop={() => void sessions.stop(id)}
            onSend={send}
          />
        </PromptInputProvider>
      </div>
    </div>
  )
}
