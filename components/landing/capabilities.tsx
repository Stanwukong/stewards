import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { ArrowUpRightIcon } from "lucide-react"

const capabilities = [
  {
    title: "Its own computer",
    description:
      "Every steward gets a private Linux computer in the cloud, with a desktop, a shell and files that stay put between chats. It writes and runs code, keeps its work, and clicks through apps on screen, all on its own machine and never on yours.",
    tags: ["Desktop", "Shell", "Code", "Files"],
  },
  {
    title: "Memory that sticks",
    description:
      "Stewards keep notes on you and your work as they go. Tell one something once and it carries that into every chat it's part of.",
    tags: ["Preferences", "Context", "Across chats"],
  },
  {
    title: "A name, a job, a face",
    description:
      "Give each steward a name, a job and instructions for how to do it. It answers as itself, stays in its lane, and gets a face no other steward has.",
    tags: ["Name", "Job", "Instructions", "Avatar"],
  },
  {
    title: "Teams, not tabs",
    description:
      "Put stewards in a group chat and @mention whoever should take the task. When one gets a message that fits someone else's job better, it hands it over.",
    tags: ["Group chats", "@mentions", "Handoffs"],
  },
  {
    title: "Work in the open",
    description:
      "Open the computer panel to watch a steward's screen live while it works. Every command it runs and every file it touches shows up in the chat.",
    tags: ["Live screen", "Tool calls", "Attachments"],
  },
]

// Numbered rows that open one at a time, the first open to start
export function Capabilities() {
  return (
    <AccordionPrimitive.Root defaultValue={[0]} className="border-t">
      {capabilities.map((capability, i) => (
        <AccordionPrimitive.Item
          key={capability.title}
          value={i}
          className="border-b"
        >
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger className="group flex w-full items-center gap-4 py-6 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:gap-8 md:py-8">
              <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground tabular-nums transition-colors duration-300 group-hover:text-brand group-data-panel-open:text-brand md:w-12">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 font-heading text-2xl font-semibold tracking-tight transition-colors duration-300 group-hover:text-brand group-data-panel-open:text-brand md:text-4xl">
                {capability.title}
              </span>
              <ArrowUpRightIcon className="size-5 shrink-0 text-muted-foreground transition-all duration-300 group-hover:text-brand group-data-panel-open:rotate-90 group-data-panel-open:text-brand" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Panel className="h-(--accordion-panel-height) overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
            <div className="flex flex-col gap-5 pr-4 pb-8 pl-12 md:flex-row md:items-end md:justify-between md:pl-20">
              <p className="max-w-xl leading-relaxed text-muted-foreground md:text-lg">
                {capability.description}
              </p>
              <ul className="flex flex-wrap gap-2 md:justify-end">
                {capability.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </AccordionPrimitive.Panel>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  )
}
