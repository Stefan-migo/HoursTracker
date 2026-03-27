'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3 } from 'lucide-react'
import type { DailyData } from '@/hooks/use-weekly-stats'
import { getLocalDateString } from '@/lib/utils'

interface WeeklySummaryWidgetProps {
  dailyData: DailyData[]
  totalHours: number
  averageHoursPerDay: number
  isLoading: boolean
}

const TARGET_HOURS = 8

function getCurrentWeekLabel(): string {
  const now = new Date()
  const startOfWeek = new Date(now)
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startOfWeek.setDate(now.getDate() - diff)
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  
  const formatDate = (date: Date) => 
    date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  
  return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`
}

export function WeeklySummaryWidget({
  dailyData,
  totalHours,
  averageHoursPerDay,
  isLoading,
}: WeeklySummaryWidgetProps) {
  const maxHours = Math.max(...dailyData.map(d => d.hours), TARGET_HOURS) + 2
  const weekLabel = getCurrentWeekLabel()
  const today = getLocalDateString()

  if (isLoading) {
    return (
      <Card className="bg-background border-border">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32 mb-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <Skeleton className="w-full rounded-t-md" style={{ height: `${Math.random() * 80 + 20}%` }} />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border-subtle">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const daysWithEntries = dailyData.filter(d => d.hours > 0).length
  const daysTargetMet = dailyData.filter(d => d.hours >= TARGET_HOURS).length

  return (
    <Card className="bg-background border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <BarChart3 className="h-4 w-4 text-accent" />
            Resumen Semanal
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-normal">
            {weekLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="flex items-end gap-1 sm:gap-2 h-32 mb-2">
            {dailyData.map((day, i) => {
              const height = maxHours > 0 ? (day.hours / maxHours) * 100 : 0
              const isToday = day.date === today
              const metTarget = day.hours >= TARGET_HOURS
              const hasEntry = day.hours > 0
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-24">
                    {hasEntry && (
                      <span className={`text-[10px] font-medium mb-1 tabular-nums ${
                        isToday ? 'text-accent' : 'text-foreground-secondary'
                      }`}>
                        {day.hours.toFixed(1)}h
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ease-out min-h-[6px] ${
                        !hasEntry 
                          ? 'bg-background-tertiary'
                          : isToday 
                            ? metTarget 
                              ? 'bg-success' 
                              : 'bg-accent'
                            : metTarget 
                              ? 'bg-success/70' 
                              : 'bg-accent/50 hover:bg-accent/70'
                      }`}
                      style={{ height: `${Math.max(height, hasEntry ? 8 : 4)}%` }}
                      title={`${day.dayName}: ${day.hours.toFixed(1)}h${metTarget ? ' ✓' : ''}`}
                    />
                  </div>
                  <span className={`text-xs ${isToday ? 'text-accent font-semibold' : 'text-foreground-secondary'}`}>
                    {day.shortDay}
                  </span>
                </div>
              )
            })}
          </div>
          
          <div className="absolute left-0 right-0 bottom-24 border-t border-dashed border-foreground/20 pointer-events-none" 
               style={{ top: `${100 - (TARGET_HOURS / maxHours) * 100}%` }}>
            <span className="absolute -top-4 right-0 text-[9px] text-foreground-secondary">Meta: {TARGET_HOURS}h</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border-subtle">
          <div className="text-center">
            <p className="text-[10px] text-foreground-secondary uppercase tracking-wide">Total</p>
            <p className="text-lg font-semibold text-foreground tabular-nums">
              {totalHours.toFixed(1)}h
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-foreground-secondary uppercase tracking-wide">Promedio</p>
            <p className="text-lg font-semibold text-foreground tabular-nums">
              {averageHoursPerDay.toFixed(1)}h
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-foreground-secondary uppercase tracking-wide">Días</p>
            <p className="text-lg font-semibold text-foreground tabular-nums">
              {daysWithEntries}/{dailyData.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
