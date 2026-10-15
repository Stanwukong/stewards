import { cn } from "@/lib/utils"

// The product's name beside an amber dot, set in the display face
function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-heading text-lg font-semibold tracking-tight",
        className
      )}
    >
      <span className="size-2.5 shrink-0 rounded-full bg-brand" />
      Stewards
    </span>
  )
}

export { Wordmark }
