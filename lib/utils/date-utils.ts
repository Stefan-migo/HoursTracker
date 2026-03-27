import { 
  format, 
  isValid,
  differenceInMinutes,
  differenceInHours
} from 'date-fns'
import { es } from 'date-fns/locale'

export function parseISOLocal(isoString: string | null | undefined): Date | null {
  if (!isoString) return null
  // Parse ISO string using native Date - JavaScript handles timezone conversion automatically
  const date = new Date(isoString)
  return isValid(date) ? date : null
}

export function formatToLocalTime(isoString: string | null | undefined): string {
  if (!isoString) return '--:--'
  // Parse the ISO string - JavaScript automatically converts to local timezone
  const date = parseISOLocal(isoString)
  if (!date) return '--:--'
  // Use date-fns format which respects local timezone
  return format(date, 'HH:mm')
}

export function formatToLocalDateTime(
  isoString: string | null | undefined, 
  formatStr: 'short' | 'long' | 'numeric' = 'short'
): string {
  if (!isoString) return '--'
  const date = parseISOLocal(isoString)
  if (!date) return '--'

  switch (formatStr) {
    case 'long':
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
    case 'numeric':
      return format(date, 'dd/MM/yyyy, HH:mm')
    case 'short':
    default:
      return format(date, "EEE, d MMM, HH:mm", { locale: es })
  }
}

export function formatToLocalDate(
  isoString: string | null | undefined,
  formatStr: 'short' | 'long' | 'numeric' = 'short'
): string {
  if (!isoString) return '--'
  const date = parseISOLocal(isoString)
  if (!date) return '--'

  switch (formatStr) {
    case 'long':
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    case 'numeric':
      return format(date, 'dd/MM/yyyy')
    case 'short':
    default:
      return format(date, "EEE, d MMM", { locale: es })
  }
}

export function getLocalHours(isoString: string | null | undefined): number {
  if (!isoString) return 0
  const date = parseISOLocal(isoString)
  if (!date) return 0
  return date.getHours()
}

export function getLocalMinutes(isoString: string | null | undefined): number {
  if (!isoString) return 0
  const date = parseISOLocal(isoString)
  if (!date) return 0
  return date.getMinutes()
}

export function getLocalTimeInMinutes(isoString: string | null | undefined): number {
  if (!isoString) return 0
  const hours = getLocalHours(isoString)
  const minutes = getLocalMinutes(isoString)
  return hours * 60 + minutes
}

export function formatElapsedTime(startTime: string | Date): string {
  const start = typeof startTime === 'string' ? parseISOLocal(startTime) : startTime
  if (!start) return '00:00:00'

  const now = new Date()
  const diffMs = now.getTime() - start.getTime()

  if (diffMs < 0) {
    return '00:00:00'
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function calculateTimeDifferenceMinutes(
  isoString1: string | null | undefined,
  isoString2: string | null | undefined
): number {
  if (!isoString1 || !isoString2) return 0
  const date1 = parseISOLocal(isoString1)
  const date2 = parseISOLocal(isoString2)
  if (!date1 || !date2) return 0
  return differenceInMinutes(date1, date2)
}

export function calculateTimeDifferenceHours(
  clockIn: string | null | undefined,
  clockOut: string | null | undefined
): number | null {
  if (!clockIn || !clockOut) return null
  const date1 = parseISOLocal(clockIn)
  const date2 = parseISOLocal(clockOut)
  if (!date1 || !date2) return null
  
  const diffMs = date2.getTime() - date1.getTime()
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
}

export function createLocalDateTime(dateStr: string, timeStr: string): string {
  // Validate inputs
  if (!dateStr || !timeStr) {
    throw new Error(`Invalid datetime: dateStr=${dateStr}, timeStr=${timeStr}`)
  }
  // Parse date and time separately
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes, seconds = 0] = timeStr.split(':').map(Number)
  
  // Create date in LOCAL timezone using individual components
  // This is critical - using the string constructor causes timezone issues
  const localDate = new Date(year, month - 1, day, hours, minutes, seconds)
  
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid datetime: ${dateStr}T${timeStr}`)
  }
  // Return as UTC ISO string so PostgreSQL TIMESTAMPTZ interprets correctly
  return localDate.toISOString()
}

export function createLocalNowISO(): string {
  return new Date().toISOString()
}

export function getCurrentLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getCurrentLocalTime(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
