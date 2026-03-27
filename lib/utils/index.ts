import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(dateString: string | null): string {
  if (!dateString) return '--:--'
  
  // If the date string contains 'Z' or '+', it's already in ISO format (UTC)
  // We need to parse it correctly and display in local time
  const date = new Date(dateString)
  
  // Check if the date is valid
  if (isNaN(date.getTime())) return '--:--'
  
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function formatDate(dateString: string, format: 'short' | 'long' | 'numeric' = 'short'): string {
  // Handle ISO datetime strings (e.g., "2024-03-26T15:30:00.000Z")
  if (dateString.includes('T')) {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Fecha inválida'
    
    switch (format) {
      case 'long':
        return date.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      case 'numeric':
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      case 'short':
      default:
        return date.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
    }
  }

  // Parse date components to avoid timezone shift issues
  // HTML date inputs return "YYYY-MM-DD" which gets parsed as UTC midnight
  // When formatted to local time, it can shift to the previous day
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day) // month is 0-indexed in JS
  
  switch (format) {
    case 'long':
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    case 'numeric':
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    case 'short':
    default:
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
  }
}

export function formatHours(hours: number | null): string {
  if (hours === null || hours === undefined) return '--'
  return `${hours.toFixed(1)}h`
}

// Format a date for datetime-local input (YYYY-MM-DDTHH:MM)
export function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Create an ISO timestamp that preserves local time (not converting to UTC)
export function toLocalISOString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

/**
 * Convert local date and time strings to UTC ISO string
 * This ensures PostgreSQL TIMESTAMPTZ stores the correct UTC time
 * @param dateStr - Date string in format "YYYY-MM-DD"
 * @param timeStr - Time string in format "HH:MM"
 * @returns ISO string in UTC format (e.g., "2025-03-22T12:00:00.000Z")
 */
export function localDateTimeToUTC(dateStr: string, timeStr: string): string {
  const localDate = new Date(`${dateStr}T${timeStr}:00`)
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid datetime: ${dateStr}T${timeStr}`)
  }
  return localDate.toISOString()
}

/**
 * Safely format a time string from database
 * Handles both UTC ISO strings and local datetime strings
 * @param dateString - ISO string from database
 * @returns Formatted time string in local timezone
 */
export function formatTimeSafe(dateString: string | null | undefined): string {
  if (!dateString) return '--:--'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '--:--'

  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Format elapsed time between two timestamps
 * Uses local browser time for accurate elapsed time calculation
 * @param startTime - Start time string or Date (ISO string from database)
 * @returns Formatted elapsed time as HH:MM:SS
 */
export function formatElapsedTime(startTime: string | Date): string {
  const start = new Date(startTime).getTime()
  const now = Date.now()
  const diff = now - start

  if (diff < 0) {
    return '00:00:00'
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Get current date as YYYY-MM-DD string in local timezone
 * Uses en-CA locale which formats as YYYY-MM-DD regardless of user locale
 * @returns Date string in format "YYYY-MM-DD"
 */
export function getLocalDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA')
}

/**
 * Calculate total hours between two timestamps
 * @param clockIn - Clock in time string
 * @param clockOut - Clock out time string
 * @returns Total hours as number (rounded to 2 decimals), or null if invalid
 */
export function calculateTotalHours(clockIn: string | null, clockOut: string | null): number | null {
  if (!clockIn || !clockOut) return null
  
  const start = new Date(clockIn).getTime()
  const end = new Date(clockOut).getTime()
  
  if (isNaN(start) || isNaN(end)) return null
  
  const diffMs = end - start
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
}
