import { Daytona, DaytonaNotFoundError, type Sandbox } from "@daytona/sdk"

// Created on first use, not on import: the constructor throws without
// DAYTONA_API_KEY, and Trigger.dev imports every task file to index it, so an
// eager client stops a build from ever becoming a version
let client: Daytona | undefined
function daytona() {
  // Passed explicitly because Next.js and Trigger.dev both load .env.local into
  // the process environment, and the SDK refuses an endpoint it finds in both
  // places rather than guess which one set it
  client ??= new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    apiUrl: process.env.DAYTONA_API_URL,
  })
  return client
}

// The bot's memory, kept in its home directory (the sandbox's working
// directory) so every chat the bot is in reads and writes the same notes
export const MEMORY_FILE = "MEMORY.md"

// Every bot gets its own sandbox, created alongside it
export async function createBotSandbox(userId: string) {
  const sandbox = await daytona().create({ labels: { userId } })

  try {
    const { exitCode, result } = await sandbox.process.executeCommand(
      `touch ${MEMORY_FILE}`
    )
    if (exitCode !== 0) throw new Error(`touch ${MEMORY_FILE} failed: ${result}`)
  } catch (error) {
    // The caller never learns this sandbox's ID, so clean it up here
    await sandbox.delete().catch((cleanupError) =>
      console.error("Failed to delete sandbox after setup failed", cleanupError)
    )
    throw error
  }

  return sandbox.id
}

export async function deleteBotSandbox(sandboxId: string) {
  try {
    const sandbox = await daytona().get(sandboxId)
    await sandbox.delete()
  } catch (error) {
    // Already gone is the outcome we wanted
    if (error instanceof DaytonaNotFoundError) return
    throw error
  }
}

// Sandboxes whose desktop this process has started. A sandbox that stops
// loses its desktop, so it's dropped from here whenever it has to be started.
const desktops = new Set<string>()

// Sandboxes auto-stop when idle, so wake one up before using it
export async function getRunningSandbox(sandboxId: string) {
  const sandbox = await daytona().get(sandboxId)

  if (sandbox.state === "starting") {
    await sandbox.waitUntilStarted()
  } else if (sandbox.state !== "started") {
    desktops.delete(sandboxId)
    await sandbox.start()
  }

  return sandbox
}

// The desktop (display, window manager, VNC) only runs once started
export async function ensureDesktop(sandbox: Sandbox) {
  if (desktops.has(sandbox.id)) return
  await sandbox.computerUse.start()
  desktops.add(sandbox.id)
}

// noVNC, the browser VNC client the default image serves alongside the desktop
const NOVNC_PORT = 6080

// A URL the browser can embed to watch and drive the sandbox's desktop, and
// the desktop's resolution so it can be scaled to fit. The token rides in the
// URL because an iframe can't send preview headers.
export async function getDesktopUrl(sandboxId: string) {
  const sandbox = await getRunningSandbox(sandboxId)

  // Another process (the agent's Trigger.dev run) may have started the
  // desktop already, so ask the sandbox rather than trusting `desktops`
  const { status } = await sandbox.computerUse.getStatus()
  if (status !== "active") await sandbox.computerUse.start()
  desktops.add(sandbox.id)

  // noVNC reconnects with the same token, so it has to outlive a long session
  const preview = await sandbox.getSignedPreviewUrl(NOVNC_PORT, 60 * 60 * 24)
  const url = new URL("vnc.html", preview.url)
  url.searchParams.set("autoconnect", "true")
  url.searchParams.set("reconnect", "true")
  url.searchParams.set("resize", "scale")

  const { displays } = await sandbox.computerUse.display.getInfo()
  const display = displays?.find((d) => d.isActive) ?? displays?.[0]

  return {
    url: url.toString(),
    width: display?.width ?? 1024,
    height: display?.height ?? 768,
  }
}
