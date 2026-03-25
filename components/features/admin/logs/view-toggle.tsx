"use client"

import * as React from "react"
import { LayoutGrid, Table2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ViewMode = "cards" | "table"

interface ViewToggleProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  className?: string
}

export function ViewToggle({ currentView, onViewChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg bg-background-secondary p-1",
        className
      )}
    >
      <button
        onClick={() => onViewChange("cards")}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          currentView === "cards"
            ? "bg-background shadow-sm text-foreground"
            : "text-foreground-secondary hover:text-foreground"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Cards</span>
      </button>
      <button
        onClick={() => onViewChange("table")}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          currentView === "table"
            ? "bg-background shadow-sm text-foreground"
            : "text-foreground-secondary hover:text-foreground"
        )}
      >
        <Table2 className="h-4 w-4" />
        <span className="hidden sm:inline">Tabla</span>
      </button>
    </div>
  )
}
