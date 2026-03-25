"use client"

import * as React from "react"
import { Calendar, ChevronDown } from "lucide-react"
import { format, startOfWeek, startOfMonth, subDays, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  startDate: Date | null
  endDate: Date | null
  onChange: (start: Date | null, end: Date | null) => void
  className?: string
  disabled?: boolean
}

interface Preset {
  label: string
  getValue: () => { start: Date; end: Date }
}

const presets: Preset[] = [
  {
    label: "Hoy",
    getValue: () => {
      const today = new Date()
      return { start: today, end: today }
    },
  },
  {
    label: "Ayer",
    getValue: () => {
      const yesterday = subDays(new Date(), 1)
      return { start: yesterday, end: yesterday }
    },
  },
  {
    label: "Últimos 7 días",
    getValue: () => {
      const today = new Date()
      return { start: subDays(today, 6), end: today }
    },
  },
  {
    label: "Últimos 30 días",
    getValue: () => {
      const today = new Date()
      return { start: subDays(today, 29), end: today }
    },
  },
  {
    label: "Esta semana",
    getValue: () => {
      const today = new Date()
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      return { start: weekStart, end: today }
    },
  },
  {
    label: "Este mes",
    getValue: () => {
      const today = new Date()
      const monthStart = startOfMonth(today)
      return { start: monthStart, end: today }
    },
  },
  {
    label: "Mes anterior",
    getValue: () => {
      const today = new Date()
      const lastMonth = subMonths(today, 1)
      const monthStart = startOfMonth(lastMonth)
      const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
      return { start: monthStart, end: monthEnd }
    },
  },
]

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className,
  disabled = false,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [tempStart, setTempStart] = React.useState<string>(
    startDate ? format(startDate, "yyyy-MM-dd") : ""
  )
  const [tempEnd, setTempEnd] = React.useState<string>(
    endDate ? format(endDate, "yyyy-MM-dd") : ""
  )
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handlePresetClick = (preset: Preset) => {
    const { start, end } = preset.getValue()
    setTempStart(format(start, "yyyy-MM-dd"))
    setTempEnd(format(end, "yyyy-MM-dd"))
  }

  const handleApply = () => {
    const start = tempStart ? new Date(tempStart) : null
    const end = tempEnd ? new Date(tempEnd) : null
    onChange(start, end)
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange(null, null)
    setTempStart("")
    setTempEnd("")
    setIsOpen(false)
  }

  const formatDisplayValue = () => {
    if (!startDate && !endDate) return "Seleccionar rango"
    if (startDate && endDate) {
      return `${format(startDate, "dd MMM", { locale: es })} - ${format(endDate, "dd MMM yyyy", { locale: es })}`
    }
    if (startDate) return `Desde ${format(startDate, "dd MMM yyyy", { locale: es })}`
    if (endDate) return `Hasta ${format(endDate, "dd MMM yyyy", { locale: es })}`
    return "Seleccionar rango"
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "min-w-[200px] justify-between font-normal",
          (startDate || endDate) && "text-foreground"
        )}
      >
        <Calendar className="mr-2 h-4 w-4 text-foreground-secondary" />
        <span className="truncate">{formatDisplayValue()}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-foreground-secondary" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-background p-3 shadow-lg animate-scale-in origin-top-right">
          <div className="space-y-3">
            <div className="border-b border-border-subtle pb-3">
              <p className="text-xs font-medium text-foreground-secondary uppercase tracking-wide">
                Presets
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-background-secondary"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground-secondary uppercase tracking-wide">
                Personalizado
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-foreground-secondary">Desde</label>
                  <Input
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-foreground-secondary">Hasta</label>
                  <Input
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="flex-1"
              >
                Limpiar
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="flex-1"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
