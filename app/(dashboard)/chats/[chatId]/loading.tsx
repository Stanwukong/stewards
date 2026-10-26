import { ChatSkeleton } from "@/components/chat"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarTrigger } from "@/components/ui/sidebar"

// Shown the moment a chat is picked, until its header and members arrive
export default function Loading() {
  return (
    <div className="flex h-svh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </header>
      <ChatSkeleton />
    </div>
  )
}
