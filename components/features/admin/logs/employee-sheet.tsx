"use client"

import * as React from "react"
import { X, User, ChevronRight } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatTime, formatHours, calculateTotalHours } from "@/lib/utils"
import { Clock as ClockIcon, ArrowRight } from "lucide-react"

interface EmployeeSheetProps {
  employeeId: string | null
  employeeName: string | null
  open: boolean
  onClose: () => void
  dateRange: { start: Date | null; end: Date | null }
  logs: Array<{
    id: string
    date: string
    clock_in: string
    clock_out: string | null
    total_hours?: number | null
    is_official?: boolean
    user_id?: string
    profiles?: {
      id: string
      full_name: string
      email: string
    }
  }>
  isLoading?: boolean
  onViewAll?: () => void
  onLogEdit?: (log: {
    id: string
    date: string
    clock_in: string
    clock_out: string | null
    total_hours: number | null | undefined
    is_official: boolean | undefined
    user_id: string
    profiles: { id: string; full_name: string; email: string }
  }) => void
}

export function EmployeeSheet({
  employeeId,
  employeeName,
  open,
  onClose,
  logs,
  isLoading = false,
  onViewAll,
  onLogEdit,
}: EmployeeSheetProps) {
  const totalHours = logs.reduce((sum, log) => {
    const hours = log.total_hours ?? (log.clock_in && log.clock_out
      ? calculateTotalHours(log.clock_in, log.clock_out)
      : 0)
    return sum + (hours ?? 0)
  }, 0)

  const avgHours = logs.length > 0 ? totalHours / logs.length : 0

  const pendingLogs = logs.filter((log) => !log.is_official).length
  const incompleteLogs = logs.filter((log) => !log.clock_out).length

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary">
              <User className="h-5 w-5 text-foreground-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate">{employeeName || "Empleado"}</SheetTitle>
              <SheetDescription>
                Detalle de registros en el período seleccionado
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-background-secondary p-3 text-center">
              <p className="text-xl font-bold text-foreground">
                {logs.length}
              </p>
              <p className="text-xs text-foreground-secondary">Registros</p>
            </div>
            <div className="rounded-lg bg-background-secondary p-3 text-center">
              <p className="text-xl font-bold text-foreground">
                {totalHours.toFixed(1)}h
              </p>
              <p className="text-xs text-foreground-secondary">Total</p>
            </div>
            <div className="rounded-lg bg-background-secondary p-3 text-center">
              <p className="text-xl font-bold text-foreground">
                {avgHours.toFixed(1)}h
              </p>
              <p className="text-xs text-foreground-secondary">Promedio</p>
            </div>
          </div>

          {(pendingLogs > 0 || incompleteLogs > 0) && (
            <div className="flex flex-wrap gap-2">
              {pendingLogs > 0 && (
                <Badge variant="secondary" className="bg-warning/10 text-warning">
                  {pendingLogs} pendientes
                </Badge>
              )}
              {incompleteLogs > 0 && (
                <Badge variant="secondary" className="bg-error/10 text-error">
                  {incompleteLogs} incompletos
                </Badge>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <h4 className="font-medium text-foreground">Registros</h4>
              {onViewAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="text-accent"
                >
                  Ver todos
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-lg bg-background-secondary"
                  />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <ClockIcon className="mx-auto h-8 w-8 text-foreground-secondary opacity-50" />
                <p className="mt-2 text-sm text-foreground-secondary">
                  No hay registros para este período
                </p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {logs.slice(0, 10).map((log) => {
                  const hours = log.total_hours ??
                    (log.clock_in && log.clock_out
                      ? calculateTotalHours(log.clock_in, log.clock_out)
                      : null)

                  const logData = {
                    id: log.id,
                    date: log.date,
                    clock_in: log.clock_in,
                    clock_out: log.clock_out,
                    total_hours: log.total_hours,
                    is_official: log.is_official,
                    user_id: log.user_id || employeeId || '',
                    profiles: log.profiles || { id: employeeId || '', full_name: employeeName || '', email: '' },
                  }

                  return (
                    <button
                      key={log.id}
                      onClick={() => onLogEdit?.(logData)}
                      className="w-full flex items-center justify-between rounded-lg border border-border-subtle p-3 hover:bg-background-secondary transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {formatDate(log.date)}
                        </p>
                        <p className="text-xs text-foreground-secondary">
                          {log.clock_in ? formatTime(log.clock_in) : "--:--"}
                          <ArrowRight className="inline mx-1 h-3 w-3" />
                          {log.clock_out ? formatTime(log.clock_out) : "--:--"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {hours !== null ? formatHours(hours) : "--"}
                        </p>
                        {!log.is_official && (
                          <Badge
                            variant="secondary"
                            className="bg-warning/10 text-warning text-xs"
                          >
                            Pendiente
                          </Badge>
                        )}
                      </div>
                    </button>
                  )
                })}
                {logs.length > 10 && (
                  <p className="text-center text-xs text-foreground-secondary py-2">
                    + {logs.length - 10} registros más
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
