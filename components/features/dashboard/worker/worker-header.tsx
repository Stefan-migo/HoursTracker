'use client'

import { Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'

interface WorkerHeaderProps {
  userName: string | null
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

function Clock() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const greeting = getGreeting(currentTime.getHours())
  
  const formattedDate = currentTime.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return { greeting, formattedDate, currentTime }
}

export function WorkerHeader({ userName }: WorkerHeaderProps) {
  const { greeting, formattedDate, currentTime } = Clock()
  
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
