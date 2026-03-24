'use client'

import { useState, useEffect } from 'react'
import {
  WorkerHeader,
  ClockInCard,
  StatusGrid,
  WeeklySummaryWidget,
  QuickActions,
} from '@/components/features/dashboard/worker'
import { useTodayLog } from '@/hooks/use-today-log'
import { useWeeklyStats } from '@/hooks/use-weekly-stats'

interface WorkerDashboardClientProps {
  userName: string | null
}

export function WorkerDashboardClient({ userName }: WorkerDashboardClientProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const {
    todayLog,
    isLoading: isLoadingToday,
    actionLoading,
    canEdit,
    handleClockOut,
    updateManual,
    createPartialRecord,
  } = useTodayLog()

  const {
    weeklyStats,
    isLoading: isLoadingWeekly,
  } = useWeeklyStats()

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hasCheckedIn = !!todayLog?.clock_in
  const hasCheckedOut = !!todayLog?.clock_out
  const isWorking = hasCheckedIn && !hasCheckedOut

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header Section */}
      <WorkerHeader 
        userName={userName} 
        currentTime={currentTime} 
      />

      {/* Main Action Section */}
      <ClockInCard
        clockIn={todayLog?.clock_in || null}
        clockOut={todayLog?.clock_out || null}
        totalHours={todayLog?.total_hours || null}
        isLoading={isLoadingToday}
        actionLoading={actionLoading}
        canEdit={canEdit}
        onClockOut={handleClockOut}
        onUpdateManual={updateManual}
        onCreateRecord={createPartialRecord}
      />

      {/* Status Grid */}
      <StatusGrid
        clockIn={todayLog?.clock_in || null}
        hoursToday={todayLog?.total_hours || null}
        weeklyHours={weeklyStats?.totalHours || 0}
        targetHours={weeklyStats?.targetHours || 40}
        isLoading={isLoadingToday || isLoadingWeekly}
        isWorking={isWorking}
      />

      {/* Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <WeeklySummaryWidget
          dailyData={weeklyStats?.dailyData || []}
          totalHours={weeklyStats?.totalHours || 0}
          averageHoursPerDay={weeklyStats?.averageHoursPerDay || 0}
          isLoading={isLoadingWeekly}
        />
        <QuickActions />
      </div>
    </div>
  )
}
