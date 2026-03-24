import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

function Spinner({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8"
  }
  
  return (
    <Loader2 className={cn("animate-spin text-accent", sizes[size], className)} />
  )
}

function SpinnerOverlay({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        {message && (
          <p className="text-sm text-foreground-secondary animate-pulse">{message}</p>
        )}
      </div>
    </div>
  )
}

function SpinnerFullscreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        {message && (
          <p className="text-sm text-foreground-secondary animate-pulse">{message}</p>
        )}
      </div>
    </div>
  )
}

export { Spinner, SpinnerOverlay, SpinnerFullscreen }