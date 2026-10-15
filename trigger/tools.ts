import type { Sandbox } from "@daytona/sdk"
import { tool, type ToolSet } from "ai"
import { z } from "zod"

import { ensureDesktop, getRunningSandbox } from "@/lib/daytona"

// Long output would crowd the model's context, so keep the head and the tail
const MAX_OUTPUT = 20_000

function truncate(text: string) {
  if (text.length <= MAX_OUTPUT) return text
  const half = MAX_OUTPUT / 2
  return `${text.slice(0, half)}\n\n[… ${text.length - MAX_OUTPUT} characters cut …]\n\n${text.slice(-half)}`
}

const screenshotOutput = z.object({
  mediaType: z.literal("image/jpeg"),
  base64: z.string(),
})

type Screenshot = z.infer<typeof screenshotOutput>

// The model reads the image itself rather than its base64 as text
function screenshotToModel({ output }: { output: Screenshot }) {
  return {
    type: "content" as const,
    value: [
      {
        type: "file" as const,
        mediaType: output.mediaType,
        data: { type: "data" as const, data: output.base64 },
      },
    ],
  }
}

const coordinates = {
  x: z
    .number()
    .int()
    .min(0)
    .describe("Pixels from the left edge of the screen"),
  y: z.number().int().min(0).describe("Pixels from the top edge of the screen"),
}

// The tools a bot uses to work its own computer, a Daytona sandbox with a
// Linux desktop. Each turn gets a fresh set bound to the bot's sandbox.
export function createComputerTools(sandboxId: string) {
  // Looked up on first use, so a turn that never touches the computer never
  // wakes the sandbox
  let running: Promise<Sandbox> | undefined
  function sandbox() {
    running ??= getRunningSandbox(sandboxId).catch((error) => {
      running = undefined
      throw error
    })
    return running
  }

  async function desktop() {
    const box = await sandbox()
    await ensureDesktop(box)
    return box.computerUse
  }

  async function screenshot(): Promise<Screenshot> {
    const computer = await desktop()
    const { screenshot } = await computer.screenshot.takeCompressed({
      format: "jpeg",
      quality: 75,
      showCursor: true,
    })
    if (!screenshot) throw new Error("The screen couldn't be captured.")
    return { mediaType: "image/jpeg", base64: screenshot }
  }

  return {
    bash: tool({
      description:
        "Run a shell command on your computer and get its exit code and output. Commands run non-interactively in a fresh shell each time, so chain steps with && and avoid commands that wait for input.",
      inputSchema: z.object({
        command: z.string().describe("The command to run"),
        cwd: z
          .string()
          .optional()
          .describe("Directory to run it in. Defaults to the home directory."),
        timeout: z
          .number()
          .int()
          .min(1)
          .max(600)
          .optional()
          .describe("Seconds to wait before giving up. Defaults to 60."),
      }),
      outputSchema: z.object({ exitCode: z.number(), output: z.string() }),
      execute: async ({ command, cwd, timeout = 60 }) => {
        const box = await sandbox()
        const response = await box.process.executeCommand(
          command,
          cwd,
          undefined,
          timeout
        )
        return {
          exitCode: response.exitCode,
          output: truncate(response.result),
        }
      },
    }),

    readFile: tool({
      description: "Read a text file on your computer.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Absolute path, or relative to the home directory"),
      }),
      outputSchema: z.object({ content: z.string() }),
      execute: async ({ path }) => {
        const box = await sandbox()
        const content = await box.fs.downloadFile(path)
        return { content: truncate(content.toString("utf8")) }
      },
    }),

    writeFile: tool({
      description:
        "Write a text file on your computer, replacing it if it exists. The folder it goes in must already exist.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Absolute path, or relative to the home directory"),
        content: z.string().describe("The file's full contents"),
      }),
      outputSchema: z.object({ path: z.string(), bytes: z.number() }),
      execute: async ({ path, content }) => {
        const box = await sandbox()
        const buffer = Buffer.from(content, "utf8")
        await box.fs.uploadFile(buffer, path)
        return { path, bytes: buffer.byteLength }
      },
    }),

    listFiles: tool({
      description: "List what's in a folder on your computer.",
      inputSchema: z.object({
        path: z
          .string()
          .describe(
            "Absolute path, or relative to the home directory. Use . for home."
          ),
      }),
      outputSchema: z.object({
        entries: z.array(
          z.object({ name: z.string(), isDir: z.boolean(), size: z.number() })
        ),
      }),
      execute: async ({ path }) => {
        const box = await sandbox()
        const files = await box.fs.listFiles(path)
        return {
          entries: files.map(({ name, isDir, size }) => ({
            name,
            isDir,
            size,
          })),
        }
      },
    }),

    mouseClick: tool({
      description:
        "Click the mouse at a point on the screen. Look at the screen first so you know where to click.",
      inputSchema: z.object({
        ...coordinates,
        button: z.enum(["left", "right", "middle"]).default("left"),
        double: z.boolean().default(false).describe("Double-click instead"),
      }),
      execute: async ({ x, y, button, double }) => {
        const computer = await desktop()
        await computer.mouse.click(x, y, button, double)
        return `${double ? "Double-clicked" : "Clicked"} ${button} at (${x}, ${y}).`
      },
    }),

    mouseMove: tool({
      description:
        "Move the mouse to a point on the screen, for example to hover.",
      inputSchema: z.object(coordinates),
      execute: async ({ x, y }) => {
        const computer = await desktop()
        await computer.mouse.move(x, y)
        return `Moved the mouse to (${x}, ${y}).`
      },
    }),

    mouseDrag: tool({
      description:
        "Press the left mouse button at one point, drag to another and release, for example to move a window, use a slider or select text.",
      inputSchema: z.object({
        fromX: coordinates.x,
        fromY: coordinates.y,
        toX: coordinates.x,
        toY: coordinates.y,
      }),
      execute: async ({ fromX, fromY, toX, toY }) => {
        const computer = await desktop()
        await computer.mouse.drag(fromX, fromY, toX, toY)
        return `Dragged from (${fromX}, ${fromY}) to (${toX}, ${toY}).`
      },
    }),

    mouseScroll: tool({
      description: "Scroll the mouse wheel over a point on the screen.",
      inputSchema: z.object({
        ...coordinates,
        direction: z.enum(["up", "down"]),
        amount: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(3)
          .describe("Wheel notches; each moves a few lines"),
      }),
      execute: async ({ x, y, direction, amount }) => {
        const computer = await desktop()
        await computer.mouse.scroll(x, y, direction, amount)
        return `Scrolled ${direction} ${amount} at (${x}, ${y}).`
      },
    }),

    keyboardType: tool({
      description:
        "Type text into whatever has keyboard focus. Newlines press Enter.",
      inputSchema: z.object({ text: z.string() }),
      execute: async ({ text }) => {
        const computer = await desktop()
        await computer.keyboard.type(text)
        return `Typed ${text.length} characters.`
      },
    }),

    keyboardPress: tool({
      description:
        "Press a single key, optionally with modifiers held, such as enter, escape, tab, backspace, arrow keys (up, down, left, right), pageup, f5, or c with ctrl to copy.",
      inputSchema: z.object({
        key: z.string().describe("The key, e.g. enter, escape, tab, a, f5"),
        modifiers: z
          .array(z.enum(["ctrl", "alt", "shift", "cmd"]))
          .default([])
          .describe("Keys held down while pressing"),
      }),
      execute: async ({ key, modifiers }) => {
        const computer = await desktop()
        await computer.keyboard.press(key, modifiers)
        return `Pressed ${[...modifiers, key].join("+")}.`
      },
    }),

    viewScreen: tool({
      description:
        "Take a screenshot so you can see the screen yourself. Only you see it, not the person. Use it before clicking or typing and after, to check what happened.",
      inputSchema: z.object({}),
      outputSchema: screenshotOutput,
      execute: screenshot,
      toModelOutput: screenshotToModel,
    }),

    showScreen: tool({
      description:
        "Take a screenshot and show it to the person in the chat. Use it when they ask to see your screen or what you're looking at. You see it too.",
      inputSchema: z.object({}),
      outputSchema: screenshotOutput,
      execute: screenshot,
      toModelOutput: screenshotToModel,
    }),
  } satisfies ToolSet
}

export type ComputerTools = ReturnType<typeof createComputerTools>
