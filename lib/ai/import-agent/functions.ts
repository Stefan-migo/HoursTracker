import type { DateFormat, TimeFormat, LLMFunctionResult } from './types'
import { DATE_FORMATS_TO_DETECT, TIME_FORMATS_TO_DETECT, EMAIL_PATTERN } from './schema'

const SPANISH_MONTHS: Record<string, number> = {
  'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
  'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
  'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'jun': 5,
  'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
}

const ENGLISH_MONTHS: Record<string, number> = {
  'january': 0, 'february': 1, 'march': 2, 'april': 3, 'june': 5,
  'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
}

const ALL_MONTHS: Record<string, number> = {
  ...ENGLISH_MONTHS,
  'mayo': 4, 'may': 4
}

export function detectDateFormat(dateStr: string): { format: DateFormat; confidence: number; normalized?: string } {
  if (!dateStr || typeof dateStr !== 'string') {
    return { format: 'unknown', confidence: 0 }
  }

  const cleaned = dateStr.trim()
  
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleaned)) {
    const [a, b] = cleaned.split('/').map(Number)
    if (a > 12) {
      return { format: 'DD/MM/YYYY', confidence: 95, normalized: normalizeDateParts(a, b, 4) }
    } else if (b > 12) {
      return { format: 'MM/DD/YYYY', confidence: 95, normalized: normalizeDateParts(b, a, 4) }
    }
    return { format: 'DD/MM/YYYY', confidence: 70, normalized: normalizeDateParts(a, b, 4) }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return { format: 'YYYY-MM-DD', confidence: 98, normalized: cleaned }
  }

  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleaned)) {
    const [a, b] = cleaned.split('-').map(Number)
    return { format: 'DD-MM-YYYY', confidence: 95, normalized: normalizeDateParts(a, b, 4) }
  }

  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(cleaned)) {
    const [a, b] = cleaned.split('.').map(Number)
    return { format: 'DD.MM.YYYY', confidence: 95, normalized: normalizeDateParts(a, b, 4) }
  }

  if (/^\d{1,2}_\d{1,2}_\d{4}$/.test(cleaned)) {
    const [a, b] = cleaned.split('_').map(Number)
    return { format: 'DD_MM_YYYY', confidence: 95, normalized: normalizeDateParts(a, b, 4) }
  }

  if (/^\d{5}$/.test(cleaned)) {
    const num = parseInt(cleaned)
    if (num > 25569 && num < 50000) {
      return { format: 'excel_serial', confidence: 85 }
    }
  }

  const textResult = parseTextDate(cleaned)
  if (textResult) {
    return textResult
  }

  return { format: 'unknown', confidence: 0 }
}

function normalizeDateParts(day: number, month: number, year: number): string {
  const fullYear = year < 100 ? 2000 + year : year
  return `${fullYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

function parseTextDate(dateStr: string): { format: DateFormat; confidence: number; normalized?: string } | null {
  const lower = dateStr.toLowerCase().trim()
  
  const monthNames = { ...SPANISH_MONTHS, ...ALL_MONTHS }
  
  const patterns = [
    /^(\d{1,2})\s+(de\s+)?([a-z]+)\s+(de\s+)?(\d{4})$/i,
    /^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i,
    /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i
  ]

  for (const pattern of patterns) {
    const match = lower.match(pattern)
    if (match) {
      let day: number, monthStr: string, year: number
      
      if (match[1] && !isNaN(Number(match[1])) && match[3]) {
        day = parseInt(match[1])
        monthStr = match[3]
        year = parseInt(match[5] || match[2])
      } else if (match[1] && isNaN(Number(match[1]))) {
        monthStr = match[1]
        day = parseInt(match[2])
        year = parseInt(match[3])
      } else {
        continue
      }
      
      const monthNum = monthNames[monthStr.toLowerCase()]
      if (monthNum !== undefined && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        return {
          format: 'text',
          confidence: 90,
          normalized: normalizeDateParts(day, monthNum + 1, year)
        }
      }
    }
  }

  return null
}

export function detectTimeFormat(timeStr: string): { format: TimeFormat; confidence: number; normalized?: string } {
  if (!timeStr || typeof timeStr !== 'string') {
    return { format: 'unknown', confidence: 0 }
  }

  const cleaned = timeStr.trim()

  if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
    const [h, m] = cleaned.split(':').map(Number)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return {
        format: h < 10 ? 'H:MM' : 'HH:MM',
        confidence: 95,
        normalized: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      }
    }
  }

  if (/^\d{1,2}:\d{2}:\d{2}$/.test(cleaned)) {
    return { format: 'HH:MM:SS', confidence: 95, normalized: cleaned }
  }

  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/)
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1])
    const minutes = parseInt(ampmMatch[2])
    const ampm = ampmMatch[3].toUpperCase()
    
    if (ampm === 'PM' && hours !== 12) hours += 12
    if (ampm === 'AM' && hours === 12) hours = 0
    
    return {
      format: '12h_AM_PM',
      confidence: 95,
      normalized: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
  }

  if (/^\d+\.\d+$/.test(cleaned)) {
    const decimal = parseFloat(cleaned)
    if (decimal >= 0 && decimal <= 1) {
      const totalMinutes = Math.round(decimal * 24 * 60)
      const h = Math.floor(totalMinutes / 60)
      const m = totalMinutes % 60
      return {
        format: 'decimal_excel',
        confidence: 85,
        normalized: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      }
    }
  }

  const textMatch = cleaned.match(/^(\d+)\s*h(?:oras?)?\s*(\d+)?\s*m(?:inutos?)?$/i)
  if (textMatch) {
    const hours = parseInt(textMatch[1])
    const minutes = textMatch[2] ? parseInt(textMatch[2]) : 0
    return {
      format: 'text',
      confidence: 80,
      normalized: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
  }

  return { format: 'unknown', confidence: 0 }
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  return EMAIL_PATTERN.test(email.trim().toLowerCase())
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function createISOTimestamp(date: string, time: string): string {
  const dateNorm = detectDateFormat(date)
  const timeNorm = detectTimeFormat(time)
  
  if (!dateNorm.normalized || !timeNorm.normalized) {
    return ''
  }
  
  return `${dateNorm.normalized}T${timeNorm.normalized}:00Z`
}

export function calculateTotalHours(clockIn: string, clockOut: string): number {
  const inNorm = detectTimeFormat(clockIn)
  const outNorm = detectTimeFormat(clockOut)
  
  if (!inNorm.normalized || !outNorm.normalized) return 0
  
  const [inH, inM] = inNorm.normalized.split(':').map(Number)
  const [outH, outM] = outNorm.normalized.split(':').map(Number)
  
  const inMinutes = inH * 60 + inM
  const outMinutes = outH * 60 + outM
  
  return (outMinutes - inMinutes) / 60
}

export function detectColumnType(values: string[]): 'email' | 'date' | 'time' | 'text' {
  const nonEmpty = values.filter(v => v && v.trim())
  if (nonEmpty.length === 0) return 'text'
  
  let emailCount = 0
  let dateCount = 0
  let timeCount = 0
  
  for (const val of nonEmpty) {
    if (isValidEmail(val)) emailCount++
    if (detectDateFormat(val).confidence > 70) dateCount++
    if (detectTimeFormat(val).confidence > 70) timeCount++
  }
  
  const threshold = nonEmpty.length * 0.5
  
  if (emailCount > threshold) return 'email'
  if (dateCount > threshold) return 'date'
  if (timeCount > threshold) return 'time'
  
  return 'text'
}

export const FUNCTION_DEFINITIONS = [
  {
    name: 'detect_date_format',
    description: 'Analyzes a string and detects the date format. Translates Spanish month names to English for processing.',
    parameters: {
      type: 'object',
      properties: {
        dateString: { type: 'string', description: 'The date string to analyze (can be in any format like "16/03/2026", "March 16, 2026", "16 de marzo 2026")' }
      },
      required: ['dateString']
    }
  },
  {
    name: 'detect_time_format',
    description: 'Analyzes a string and detects the time format',
    parameters: {
      type: 'object',
      properties: {
        timeString: { type: 'string', description: 'The time string to analyze (can be in formats like "08:55", "8:55 AM", "0.354167")' }
      },
      required: ['timeString']
    }
  },
  {
    name: 'validate_email',
    description: 'Validates if a string is a valid email address',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'The email string to validate' }
      },
      required: ['email']
    }
  },
  {
    name: 'normalize_email',
    description: 'Normalizes an email address to lowercase and trimmed',
    parameters: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'The email to normalize' }
      },
      required: ['email']
    }
  },
  {
    name: 'create_iso_timestamp',
    description: 'Combines a date string and time string into ISO 8601 timestamp',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'The date string (any format)' },
        time: { type: 'string', description: 'The time string (any format)' }
      },
      required: ['date', 'time']
    }
  }
]

export async function callFunction(name: string, args: Record<string, unknown>): Promise<LLMFunctionResult> {
  try {
    switch (name) {
      case 'detect_date_format': {
        const result = detectDateFormat(args.dateString as string)
        return { success: true, result }
      }
      
      case 'detect_time_format': {
        const result = detectTimeFormat(args.timeString as string)
        return { success: true, result }
      }
      
      case 'validate_email': {
        const result = isValidEmail(args.email as string)
        return { success: true, result }
      }
      
      case 'normalize_email': {
        const result = normalizeEmail(args.email as string)
        return { success: true, result }
      }
      
      case 'create_iso_timestamp': {
        const result = createISOTimestamp(args.date as string, args.time as string)
        return { success: true, result }
      }
      
      default:
        return { success: false, error: `Unknown function: ${name}` }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
