import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

// Three spheres orbiting each other, while a bot is working on an answer
export function WorkingIndicator({ className }: { className?: string }) {
  return (
    <span role="status" className={cn("orbit", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="orbit-sphere"
          // A third of a turn apart
          style={
            {
              "--orbit-delay": `calc(var(--orbit-turn) * ${-i / 3})`,
            } as CSSProperties
          }
        />
      ))}
      <span className="sr-only">Working</span>
    </span>
  )
}
