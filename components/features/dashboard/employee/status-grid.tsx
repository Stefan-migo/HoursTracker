'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LogIn, Timer, Target } from 'lucide-react'
import { formatTime } from '@/lib/utils'

interface StatusGridProps {
  clockIn: string | null
  hoursToday: number | null
  weeklyHours: number
  targetHours: number
  isLoading: boolean
  isWorking: boolean
}

export function StatusGrid({
  clockIn,
  hoursToday,
  weeklyHours,
  targetHours,
  isLoading,
  isWorking,
}: StatusGridProps) {
  const progressPercentage = Math.min((weeklyHours / targetHours) * 100, 100)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-background border-border">
            <CardContent className="p-4">
              <Skeleton className="h-8 w-8 rounded-lg mb-2" />
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {/* Widget 1: Hora de Entrada */}
      <Card className="bg-background border-border transition-all duration-200 hover:border-accent/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <LogIn className="h-5 w-5 text-success" />
            </div>
            <span className="text-xs text-foreground-secondary uppercase tracking-wide font-medium">
              Entrada
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-foreground tabular-nums tracking-tight">
            {formatTime(clockIn)}
          </p>
        </CardContent>
      </Card>

      {/* Widget 2: Horas Hoy */}
      <Card className="bg-background border-border transition-all duration-200 hover:border-accent/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Timer className="h-5 w-5 text-accent" />
            </div>
            <span className="text-xs text-foreground-secondary uppercase tracking-wide font-medium">
              Horas Hoy
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl sm:text-3xl font-semibold text-foreground tabular-nums tracking-tight">
              {hoursToday?.toFixed(1) || '0.0'}
            </p>
            <span className="text-sm text-foreground-secondary">h</span>
          </div>
          {isWorking && (
            <p className="text-xs text-success mt-1 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              En curso
            </p>
          )}
        </CardContent>
      </Card>

      {/* Widget 3: Progreso Semanal */}
      <Card className="bg-background border-border transition-all duration-200 hover:border-accent/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-accent" />
            </div>
            <span className="text-xs text-foreground-secondary uppercase tracking-wide font-medium">
              Esta Semana
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-2xl sm:text-3xl font-semibold text-foreground tabular-nums tracking-tight">
              {weeklyHours.toFixed(1)}
            </span>
            <span className="text-sm text-foreground-secondary">/ {targetHours}h</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
