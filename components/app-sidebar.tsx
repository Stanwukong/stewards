"use client"

import * as React from "react"
import { UserButton } from "@clerk/nextjs"
import { formatDistanceToNowStrict } from "date-fns"
import { PlusIcon, SearchIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { ChatListItem } from "@/queries/bots"

export function AppSidebar({ chats }: { chats: ChatListItem[] }) {
  const [botDialogOpen, setBotDialogOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const activeChatRef = React.useRef<HTMLAnchorElement>(null)
  const previousPathnameRef = React.useRef(pathname)

  // Bring the active chat into view, and move focus to it after navigating
  // (e.g. from search) but not on first load.
  React.useEffect(() => {
    const link = activeChatRef.current
    const navigated = previousPathnameRef.current !== pathname
    previousPathnameRef.current = pathname
    if (!link) return

    link.scrollIntoView({ block: "nearest" })
    if (navigated) link.focus({ preventScroll: true })
  }, [pathname])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" />}
            >
              <PlusIcon />
              <span className="sr-only">New</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
                  <PlusIcon />
                  Create new bot
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UsersIcon />
                  Create group chat
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Input's look on an outline Button, so the button hover still applies */}
        <Button
          variant="outline"
          onClick={() => setSearchOpen(true)}
          className="h-8 w-full min-w-0 justify-start rounded-lg border border-input bg-transparent px-2.5 py-1 text-base font-normal text-muted-foreground group-data-[collapsible=icon]:hidden md:text-sm dark:bg-input/30"
        >
          <SearchIcon data-icon="inline-start" />
          Search
          <KbdGroup className="ml-auto">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </Button>
        {/* Collapsed, search matches the New button instead of the input */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchOpen(true)}
          className="hidden group-data-[collapsible=icon]:inline-flex"
        >
          <SearchIcon />
          <span className="sr-only">Search</span>
        </Button>
        <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
        <CommandDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          title="Search chats"
          description="Search for a chat to open."
        >
          <Command>
            <CommandInput placeholder="Search chats..." />
            <CommandList>
              <CommandEmpty>No chats found.</CommandEmpty>
              <CommandGroup heading="Chats">
                {chats.map((chat) => {
                  const name = chat.name ?? chat.bot.name

                  return (
                    <CommandItem
                      key={chat.id}
                      value={chat.id}
                      keywords={[name, chat.bot.job]}
                      onSelect={() => {
                        router.push(`/chats/${chat.id}`)
                        setSearchOpen(false)
                      }}
                    >
                      <ChatAvatar seed={chat.bot.avatar} className="size-6" />
                      <span className="truncate">{name}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </CommandDialog>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => {
                const href = `/chats/${chat.id}`
                const isActive = pathname === href

                return (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      size="lg"
                      isActive={isActive}
                      tooltip={chat.name ?? chat.bot.name}
                      render={
                        <Link
                          href={href}
                          ref={isActive ? activeChatRef : undefined}
                        />
                      }
                      className="group-data-[collapsible=icon]:p-1!"
                    >
                      <ChatAvatar
                        seed={chat.bot.avatar}
                        className="group-data-[collapsible=icon]:size-6"
                      />
                      <div className="grid flex-1 leading-tight">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-medium">
                            {chat.name ?? chat.bot.name}
                          </span>
                          {/* Relative time can tick over between server render and hydration */}
                          <time
                            dateTime={chat.lastMessageAt.toISOString()}
                            suppressHydrationWarning
                            className="shrink-0 text-xs text-muted-foreground"
                          >
                            {formatDistanceToNowStrict(chat.lastMessageAt)}
                          </time>
                        </div>
                        <span className="truncate text-xs text-muted-foreground">
                          {chat.lastMessagePreview ?? chat.bot.job}
                        </span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<div />}
              className="group-data-[collapsible=icon]:p-1! has-focus-visible:ring-2"
            >
              <UserButton
                showName
                appearance={{
                  elements: {
                    // Clerk's own styles win over plain utilities here, so
                    // these overrides are marked important.
                    rootBox: "flex! w-full! min-w-0!",
                    // Stretch the trigger's hit area over the whole menu item
                    // and let the SidebarMenuButton own hover and focus styles.
                    userButtonTrigger:
                      "static! w-full! justify-start! rounded-none! p-0! text-inherit! outline-none! shadow-none! after:absolute after:inset-0",
                    userButtonBox:
                      "w-full! min-w-0! flex-row-reverse! justify-end! gap-2!",
                    userButtonAvatarBox: "size-6! rounded-md!",
                    userButtonOuterIdentifier:
                      "truncate! ps-0! text-sm! font-normal! text-inherit! group-data-[collapsible=icon]:hidden!",
                  },
                }}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
