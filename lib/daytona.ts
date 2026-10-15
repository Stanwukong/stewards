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

// Every bot gets its own sandbox, created alongside it
export async function createBotSandbox(userId: string) {
  const sandbox = await daytona().create({ labels: { userId } })
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
