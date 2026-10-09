"use client"

import * as React from "react"
import { UserButton } from "@clerk/nextjs"
import { formatDistanceToNowStrict } from "date-fns"
import { PlusIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/sidebar"
import type { ChatListItem } from "@/queries/bots"

export function AppSidebar({ chats }: { chats: ChatListItem[] }) {
  const [botDialogOpen, setBotDialogOpen] = React.useState(false)
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="flex-row justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" />}
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
        <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => {
                const href = `/chats/${chat.id}`

                return (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      size="lg"
                      isActive={pathname === href}
                      tooltip={chat.name ?? chat.bot.name}
                      render={<Link href={href} />}
                    >
                      <ChatAvatar seed={chat.bot.avatar} />
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
              className="has-focus-visible:ring-2"
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
                    userButtonBox: "w-full! min-w-0! flex-row-reverse! justify-end! gap-2!",
                    userButtonAvatarBox: "size-6! rounded-md!",
                    userButtonOuterIdentifier:
                      "truncate! ps-0! text-sm! font-normal! text-inherit!",
                  },
                }}
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
