// Utilidades para determinar contexto temporal (hora del día, día de semana, etc.)

import type { TimeOfDay } from '@/lib/messages/types'

/**
 * Determina la parte del día basada en la hora actual
 */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) {
    return 'morning'
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon'
  } else if (hour >= 18 && hour < 22) {
    return 'evening'
  } else {
    return 'night'
  }
}

/**
 * Obtiene el nombre del día de la semana en español
 */
export function getDayOfWeek(date: Date = new Date()): string {
  const days = [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
  ]
  return days[date.getDay()]
}

/**
 * Obtiene un saludo según la hora del día
 */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) {
    return 'Buenos días'
  } else if (hour >= 12 && hour < 18) {
    return 'Buenas tardes'
  } else {
    return 'Buenas noches'
  }
}

/**
 * Formatea un tiempo transcurrido en formato HH:MM:SS
 */
export function formatElapsedTime(startTime: string): string {
  const start = new Date(startTime)
  const now = new Date()
  const diff = now.getTime() - start.getTime()

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Parsea un tiempo en formato "HH:MM:SS" a minutos totales
 */
export function parseElapsedToMinutes(elapsedTime: string): number {
  const parts = elapsedTime.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}
