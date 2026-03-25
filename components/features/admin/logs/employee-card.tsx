"use client"

import * as React from "react"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface EmployeeCardProps {
  employee: {
    id: string
    full_name: string
    email: string
  }
  stats: {
    total_hours: number
    record_count: number
    average_hours: number
    compliance_percent: number
  }
  onClick: () => void
  className?: string
}

export function EmployeeCard({
  employee,
  stats,
  onClick,
  className,
}: EmployeeCardProps) {
  const complianceColor =
    stats.compliance_percent >= 90
      ? "text-success"
      : stats.compliance_percent >= 70
        ? "text-warning"
        : "text-error"

  const complianceBg =
    stats.compliance_percent >= 90
      ? "bg-success/10"
      : stats.compliance_percent >= 70
        ? "bg-warning/10"
        : "bg-error/10"

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border border-border bg-background p-4",
        "transition-all hover:border-accent/50 hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background-secondary">
          <User className="h-5 w-5 text-foreground-secondary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {employee.full_name}
          </p>
          <p className="truncate text-xs text-foreground-secondary">
            {employee.email}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-foreground">
            {stats.total_hours.toFixed(1)}h
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              complianceBg,
              complianceColor
            )}
          >
            {stats.compliance_percent >= 90 && "✓ "}
            {stats.compliance_percent >= 70 && stats.compliance_percent < 90 && "⚠ "}
            {stats.compliance_percent < 70 && "✗ "}
            {stats.compliance_percent}%
          </span>
        </div>

        <Progress
          value={Math.min(stats.compliance_percent, 100)}
          className={cn(
            "h-2",
            stats.compliance_percent >= 90 && "[&>div]:bg-success",
            stats.compliance_percent >= 70 &&
              stats.compliance_percent < 90 &&
              "[&>div]:bg-warning",
            stats.compliance_percent < 70 && "[&>div]:bg-error"
          )}
        />

        <div className="flex items-center justify-between text-xs text-foreground-secondary">
          <span>{stats.record_count} registros</span>
          <span>Ø {stats.average_hours.toFixed(1)}h/día</span>
        </div>
      </div>
    </button>
  )
}
