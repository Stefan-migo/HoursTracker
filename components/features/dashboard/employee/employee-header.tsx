'use client'

import { Calendar } from 'lucide-react'

interface EmployeeHeaderProps {
  userName: string | null
  currentTime: Date
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return 'Buenos días'
  } else if (hour >= 12 && hour < 18) {
    return 'Buenas tardes'
  } else {
    return 'Buenas noches'
  }
}

export function EmployeeHeader({ userName, currentTime }: EmployeeHeaderProps) {
  const greeting = getGreeting(currentTime.getHours())
  
  const formattedDate = currentTime.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-1">
      <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
        {greeting}, {userName || 'Usuario'}
      </h1>
      <p className="text-foreground-secondary flex items-center gap-2 text-sm sm:text-base">
        <Calendar className="h-4 w-4" />
        <span className="capitalize">{formattedDate}</span>
      </p>
    </div>
  )
}
