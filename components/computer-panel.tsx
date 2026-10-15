"use client"

import { MonitorIcon } from "lucide-react"
import * as React from "react"
import { createPortal } from "react-dom"
import { usePanelRef } from "react-resizable-panels"

import { getComputerUrl } from "@/actions/chats"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

type Desktop = Awaited<ReturnType<typeof getComputerUrl>>

type Screen =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; desktop: Desktop }
  | { status: "error" }

type ComputerPanelContextValue = {
  panelRef: ReturnType<typeof usePanelRef>
  open: boolean
  setOpen: (open: boolean) => void
  screen: Screen
  load: () => void
  setPanelSlot: (element: HTMLDivElement | null) => void
}

const ComputerPanelContext =
  React.createContext<ComputerPanelContextValue | null>(null)

function useComputerPanel() {
  const context = React.useContext(ComputerPanelContext)
  if (!context) {
    throw new Error(
      "useComputerPanel must be used within ComputerPanelProvider"
    )
  }
  return context
}

export function ComputerPanelProvider({
  chatId,
  children,
}: {
  chatId: string
  children: React.ReactNode
}) {
  const panelRef = usePanelRef()
  const [open, setOpen] = React.useState(false)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [screen, setScreen] = React.useState<Screen>({ status: "idle" })
  const [panelSlot, setPanelSlot] = React.useState<HTMLDivElement | null>(null)
  const [dialogSlot, setDialogSlot] = React.useState<HTMLDivElement | null>(
    null
  )

  const load = React.useCallback(() => {
    setScreen({ status: "loading" })
    getComputerUrl(chatId).then(
      (desktop) => setScreen({ status: "ready", desktop }),
      () => setScreen({ status: "error" })
    )
  }, [chatId])

  // Waking the sandbox is slow, so wait until someone first opens the panel
  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (next && screen.status === "idle") load()
  }

  return (
    <ComputerPanelContext
      value={{
        panelRef,
        open,
        setOpen: changeOpen,
        screen,
        load,
        setPanelSlot,
      }}
    >
      <Dialog
        open={fullscreen}
        disablePointerDismissal
        // Keys and clicks meant for the desktop must never close it, so only
        // the close button does
        onOpenChange={(next, details) => {
          if (!next && details.reason !== "close-press") return
          setFullscreen(next)
        }}
      >
        {children}
        {screen.status === "ready" && (
          <ComputerScreen
            desktop={screen.desktop}
            interactive={fullscreen}
            slot={fullscreen ? dialogSlot : panelSlot}
          />
        )}
        <DialogContent className="flex h-[calc(100svh-2rem)] flex-col sm:max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Computer</DialogTitle>
            <DialogDescription>
              Your mouse and keyboard control this desktop.
            </DialogDescription>
          </DialogHeader>
          <div
            ref={setDialogSlot}
            className="min-h-0 flex-1 overflow-hidden rounded-lg bg-muted"
          />
        </DialogContent>
      </Dialog>
    </ComputerPanelContext>
  )
}

// The one VNC session, shared by the panel and the dialog. Moving an iframe
// in the DOM reloads it, so it stays put in a body portal and is laid over
// whichever slot is showing instead.
function ComputerScreen({
  desktop,
  interactive,
  slot,
}: {
  desktop: Desktop
  interactive: boolean
  slot: HTMLDivElement | null
}) {
  const [host, setHost] = React.useState<HTMLDivElement | null>(null)
  const [frame, setFrame] = React.useState<HTMLIFrameElement | null>(null)

  // Slots move without resizing (the dialog zooms in, the sidebar slides), so
  // follow them every frame rather than with a ResizeObserver
  React.useEffect(() => {
    if (!host || !frame) return

    let request = 0
    let last = ""
    const follow = () => {
      const rect = slot?.getBoundingClientRect()
      const visible = rect && rect.width > 0 && rect.height > 0
      const next = visible
        ? `${rect.left},${rect.top},${rect.width},${rect.height}`
        : ""
      if (next !== last) {
        last = next
        host.style.visibility = visible ? "visible" : "hidden"
        if (visible) {
          host.style.left = `${rect.left}px`
          host.style.top = `${rect.top}px`
          host.style.width = `${rect.width}px`
          host.style.height = `${rect.height}px`

          // The iframe keeps the desktop's own size and is zoomed to fit
          // whole, so a bigger slot shows a bigger screen rather than more of
          // the page inside the iframe
          const scale = Math.min(
            rect.width / desktop.width,
            rect.height / desktop.height
          )
          const x = (rect.width - desktop.width * scale) / 2
          const y = (rect.height - desktop.height * scale) / 2
          frame.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
        }
      }
      request = requestAnimationFrame(follow)
    }
    follow()

    return () => cancelAnimationFrame(request)
  }, [host, frame, slot, desktop])

  return createPortal(
    <div
      ref={setHost}
      className={cn(
        "invisible fixed overflow-hidden rounded-lg",
        // Above the dialog's backdrop and popup while fullscreen
        interactive ? "z-60" : "z-10"
      )}
    >
      <iframe
        ref={setFrame}
        src={desktop.url}
        width={desktop.width}
        height={desktop.height}
        title="Computer"
        // Only the dialog takes input, so the panel stays a preview
        tabIndex={interactive ? 0 : -1}
        allow="clipboard-read; clipboard-write"
        className="absolute top-0 left-0 origin-top-left border-0"
      />
      {!interactive && (
        <DialogTrigger
          render={
            <button
              type="button"
              className="absolute inset-0 cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            />
          }
        >
          <span className="sr-only">Open computer fullscreen</span>
        </DialogTrigger>
      )}
    </div>,
    document.body
  )
}

export function ComputerPanel() {
  const { panelRef, open, setOpen, screen, load, setPanelSlot } =
    useComputerPanel()

  return (
    <>
      <ResizableHandle className={open ? undefined : "hidden"} />
      <ResizablePanel
        panelRef={panelRef}
        collapsible
        defaultSize="0%"
        minSize="30%"
        maxSize="70%"
        // Dragging the handle past the threshold collapses the panel too, so
        // follow the panel's size rather than only the toggle
        onResize={(size) => setOpen(size.asPercentage > 0)}
      >
        <div className="flex h-full flex-col p-4">
          {screen.status === "error" ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MonitorIcon />
                </EmptyMedia>
                <EmptyTitle>Couldn&apos;t reach the computer</EmptyTitle>
                <EmptyDescription>
                  The sandbox didn&apos;t start or its desktop isn&apos;t
                  running.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" size="sm" onClick={load}>
                  Try again
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div
              ref={setPanelSlot}
              className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted"
              // Match the desktop's shape so the preview fills the slot
              style={
                screen.status === "ready"
                  ? {
                      aspectRatio: `${screen.desktop.width} / ${screen.desktop.height}`,
                    }
                  : undefined
              }
            >
              {screen.status !== "ready" && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner />
                  Starting computer…
                </div>
              )}
            </div>
          )}
        </div>
      </ResizablePanel>
    </>
  )
}

export function ComputerPanelToggle() {
  const { panelRef, open } = useComputerPanel()

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="ml-auto"
      aria-pressed={open}
      onClick={() =>
        open ? panelRef.current?.collapse() : panelRef.current?.expand()
      }
    >
      <MonitorIcon />
      <span className="sr-only">
        {open ? "Hide computer" : "Show computer"}
      </span>
    </Button>
  )
}
