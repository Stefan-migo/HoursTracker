'use client'

import { useState, useEffect, useCallback } from 'react'
import { calculateTotalHours } from '@/lib/utils'

export interface WeeklyStats {
  totalHours: number
  daysWorked: number
  averageHoursPerDay: number
  targetHours: number
  progressPercentage: number
  dailyData: DailyData[]
}

export interface DailyData {
  date: string
  dayName: string
  shortDay: string
  hours: number
  hasEntry: boolean
  entries: number // Track number of entries for this day
}

interface UseWeeklyStatsReturn {
  weeklyStats: WeeklyStats | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useWeeklyStats(customTargetHours?: number): UseWeeklyStatsReturn {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use shared utility for calculation
  const calculateLogHours = (log: any): number => {
    if (log.total_hours !== null && log.total_hours !== undefined) {
      return log.total_hours
    }
    return calculateTotalHours(log.clock_in, log.clock_out) || 0
  }

  const processWeeklyData = (logs: any[], customTargetHours?: number): WeeklyStats => {
    const today = new Date()
    const currentDay = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1))
    startOfWeek.setHours(0, 0, 0, 0)

    const weekLogs = logs.filter((log) => {
      const logDate = new Date(log.date)
      return logDate >= startOfWeek && logDate <= today
    })

    const totalHours = weekLogs.reduce((sum, log) => sum + calculateLogHours(log), 0)
    const daysWorked = new Set(weekLogs.map((log) => log.date)).size
    const averageHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0
    const targetHours = customTargetHours || 40
    const progressPercentage = Math.min((totalHours / targetHours) * 100, 100)

    const dailyData: DailyData[] = []
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const fullDayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      const dayLogs = weekLogs.filter((log) => log.date === dateStr)
      const hours = dayLogs.reduce((sum, log) => sum + calculateLogHours(log), 0)

      dailyData.push({
        date: dateStr,
        dayName: fullDayNames[i],
        shortDay: dayNames[i],
        hours,
        hasEntry: dayLogs.length > 0,
        entries: dayLogs.length,
      })
    }

    return {
      totalHours,
      daysWorked,
      averageHoursPerDay,
      targetHours,
      progressPercentage,
      dailyData,
    }
  }

  const fetchWeeklyStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const res = await fetch('/api/time-logs?limit=100&source=personal')
      if (res.ok) {
        const data = await res.json()
        const logs = data.data || []
        const stats = processWeeklyData(logs, customTargetHours)
        setWeeklyStats(stats)
      } else {
        throw new Error('Error fetching logs')
      }
    } catch (err) {
      console.error('Error fetching weekly stats:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [customTargetHours])

  const refresh = async () => {
    await fetchWeeklyStats()
  }

  useEffect(() => {
    fetchWeeklyStats()
  }, [fetchWeeklyStats])

  return {
    weeklyStats,
    isLoading,
    error,
    refresh,
  }
}
