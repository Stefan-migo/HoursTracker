import type { TransformedRecord } from './types'
import { DataPatterns, parseCombinedTime, parseMonthAbbrDate } from './pattern-analyzer'
import { isValidEmail, normalizeEmail } from './functions'

export interface TransformOptions {
  skipEmptyHours?: boolean
  validateEmail?: boolean
}

export function transformWithPatterns(
  headers: string[],
  rows: Record<string, string>[],
  patterns: DataPatterns,
  options?: TransformOptions
): TransformedRecord[] {
  console.log('[UniversalTransformer] Starting transformation with patterns')
  console.log('[UniversalTransformer] Format type:', patterns.formatType)
  console.log('[UniversalTransformer] Has combined entry-exit:', patterns.hasCombinedEntryExit)
  console.log('[UniversalTransformer] Date columns:', patterns.dateColumns.length)
  
  const records: TransformedRecord[] = []
  
  if (patterns.formatType === 'horizontal') {
    return transformHorizontal(headers, rows, patterns, options)
  } else if (patterns.formatType === 'vertical') {
    return transformVertical(headers, rows, patterns, options)
  }
  
  // Try to auto-detect if unknown
  if (patterns.dateColumns.length > 0) {
    return transformHorizontal(headers, rows, patterns, options)
  }
  
  // Fallback: treat all as vertical
  return transformVertical(headers, rows, patterns, options)
}

function transformHorizontal(
  headers: string[],
  rows: Record<string, string>[],
  patterns: DataPatterns,
  options?: TransformOptions
): TransformedRecord[] {
  const records: TransformedRecord[] = []
  
  // Find employee columns - search for common column names
  const nameCol = patterns.employeeIdentifier.nameColumns[0]
  const emailCol = patterns.employeeIdentifier.emailColumns[0]
  const idCol = patterns.employeeIdentifier.idColumns[0]
  
  // NEW: Find separate name columns (Apellidos, Nombres)
  const apellidoCol = headers.find(h => /apellido[s]?/i.test(h))
  const nombreCol = headers.find(h => /^nombre[s]?$/i.test(h))
  
  // NEW: Find Info_Contacto column (contains email and address)
  const infoContactoCol = headers.find(h => /info_?contacto/i.test(h))
  
  console.log('[UniversalTransformer] Employee columns:', { nameCol, emailCol, idCol, apellidoCol, nombreCol, infoContactoCol })
  console.log('[UniversalTransformer] Date columns:', patterns.dateColumns.map(d => d.columnName))
  
  for (const row of rows) {
    // Get employee info - combine Apellidos + Nombres if available
    let fullName = ''
    if (apellidoCol && nombreCol) {
      const apellido = row[apellidoCol] || ''
      const nombre = row[nombreCol] || ''
      fullName = `${nombre} ${apellido}`.trim()
    } else if (nameCol) {
      fullName = row[nameCol]
    } else if (idCol) {
      fullName = row[idCol]
    }
    
    // Get email - try direct column or extract from Info_Contacto
    let email = emailCol ? row[emailCol] : ''
    if (!email && infoContactoCol) {
      // Extract email from "email -- address" format
      const infoContacto = row[infoContactoCol] || ''
      const emailMatch = infoContacto.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
      if (emailMatch) {
        email = emailMatch[1].toLowerCase()
      }
    }
    
    // Process each date column
    for (const dateCol of patterns.dateColumns) {
      const cellValue = row[dateCol.columnName] || ''
      
      // Skip empty or non-work values
      if (!cellValue || isNonWorkValue(cellValue)) {
        if (options?.skipEmptyHours) continue
      }
      
      const issues: string[] = []
      let clockIn = ''
      let clockOut = ''
      
      // Check if this is a combined entry-exit format
      if (patterns.hasCombinedEntryExit || isCombinedFormat(cellValue)) {
        const parsed = parseCombinedTime(cellValue)
        if (parsed.clockIn && parsed.clockOut) {
          clockIn = `${dateCol.dateNormalized}T${parsed.clockIn}:00Z`
          clockOut = `${dateCol.dateNormalized}T${parsed.clockOut}:00Z`
        } else if (cellValue) {
          issues.push(`No se pudieron parsear las horas: ${cellValue}`)
        }
      } else {
        // Try to extract times from the cell value
        const parsed = parseCombinedTime(cellValue)
        if (parsed.clockIn && parsed.clockOut) {
          clockIn = `${dateCol.dateNormalized}T${parsed.clockIn}:00Z`
          clockOut = `${dateCol.dateNormalized}T${parsed.clockOut}:00Z`
        } else if (cellValue) {
          issues.push(`Formato de hora no reconocido: ${cellValue}`)
        }
      }
      
      // Validate email if needed
      if (options?.validateEmail !== false && email && !isValidEmail(email)) {
        issues.push(`Email inválido: ${email}`)
      }
      
      const isValid = issues.length === 0 && !!clockIn && !!clockOut
      
      if (clockIn || clockOut || !options?.skipEmptyHours) {
        records.push({
          email: email ? normalizeEmail(email) : '',
          fullName: formatFullName(fullName),
          date: dateCol.dateNormalized,
          clockIn,
          clockOut,
          isValid,
          issues,
          rawData: row
        })
      }
    }
  }
  
  return records
}

function transformVertical(
  headers: string[],
  rows: Record<string, string>[],
  patterns: DataPatterns,
  options?: TransformOptions
): TransformedRecord[] {
  const records: TransformedRecord[] = []
  
  // Find columns
  const dateColumn = patterns.columns.find(c => c.detectedType === 'date')
  const timeColumns = patterns.columns.filter(c => c.detectedType === 'time')
  const nameCol = patterns.employeeIdentifier.nameColumns[0]
  const emailCol = patterns.employeeIdentifier.emailColumns[0]
  
  // NEW: Find separate name columns (Apellidos, Nombres)
  const apellidoCol = headers.find(h => /apellido[s]?/i.test(h))
  const nombreCol = headers.find(h => /^nombre[s]?$/i.test(h))
  
  // NEW: Find Info_Contacto column
  const infoContactoCol = headers.find(h => /info_?contacto/i.test(h))
  
  console.log('[UniversalTransformer] Vertical - Date column:', dateColumn?.columnName)
  console.log('[UniversalTransformer] Vertical - Time columns:', timeColumns.map(t => t.columnName))
  
  if (!dateColumn) {
    console.log('[UniversalTransformer] No date column found for vertical format')
    return records
  }
  
  for (const row of rows) {
    const dateValue = row[dateColumn.columnName] || ''
    
    // Combine Apellidos + Nombres
    let fullName = ''
    if (apellidoCol && nombreCol) {
      const apellido = row[apellidoCol] || ''
      const nombre = row[nombreCol] || ''
      fullName = `${nombre} ${apellido}`.trim()
    } else if (nameCol) {
      fullName = row[nameCol] || ''
    }
    
    // Get email - try direct column or extract from Info_Contacto
    let email = emailCol ? row[emailCol] : ''
    if (!email && infoContactoCol) {
      const infoContacto = row[infoContactoCol] || ''
      const emailMatch = infoContacto.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
      if (emailMatch) {
        email = emailMatch[1].toLowerCase()
      }
    }
    
    if (!dateValue) continue
    
    // Parse date
    let dateNormalized: string | null = null
    
    // Try month abbreviation format
    const monthAbbrParsed = parseMonthAbbrDate(dateValue)
    if (monthAbbrParsed) {
      dateNormalized = monthAbbrParsed.normalized
    } else {
      // Try standard date parsing
      dateNormalized = parseStandardDate(dateValue)
    }
    
    if (!dateNormalized) {
      continue
    }
    
    const issues: string[] = []
    let clockIn = ''
    let clockOut = ''
    
    // Find time values
    for (const timeCol of timeColumns) {
      const timeValue = row[timeCol.columnName] || ''
      
      if (!timeValue) continue
      
      const headerLower = timeCol.columnName.toLowerCase()
      
      // Check if it's a combined entry-exit column
      if (timeCol.isCombinedEntryExit || isCombinedFormat(timeValue)) {
        const parsed = parseCombinedTime(timeValue)
        if (parsed.clockIn) {
          clockIn = `${dateNormalized}T${parsed.clockIn}:00Z`
        }
        if (parsed.clockOut) {
          clockOut = `${dateNormalized}T${parsed.clockOut}:00Z`
        }
      } else {
        // Separate columns - determine if entry or exit
        if (headerLower.includes('entrada') || headerLower.includes('in') || headerLower.includes('clock_in')) {
          const parsed = parseSingleTime(timeValue)
          if (parsed) {
            clockIn = `${dateNormalized}T${parsed}:00Z`
          }
        } else if (headerLower.includes('salida') || headerLower.includes('out') || headerLower.includes('clock_out')) {
          const parsed = parseSingleTime(timeValue)
          if (parsed) {
            clockOut = `${dateNormalized}T${parsed}:00Z`
          }
        }
      }
    }
    
    // Validate
    if (options?.validateEmail !== false && email && !isValidEmail(email)) {
      issues.push(`Email inválido: ${email}`)
    }
    
    const isValid = issues.length === 0 && !!clockIn && !!clockOut
    
    // Skip if no times and skipEmptyHours is true
    if (!clockIn && !clockOut && options?.skipEmptyHours) {
      continue
    }
    
    records.push({
      email: email ? normalizeEmail(email) : '',
      fullName: formatFullName(fullName),
      date: dateNormalized,
      clockIn,
      clockOut,
      isValid,
      issues,
      rawData: row
    })
  }
  
  return records
}

function isNonWorkValue(value: string): boolean {
  const nonWorkValues = [
    'no laborable',
    'no labourable',
    'libre',
    'feriado',
    'vacaciones',
    'falta médica',
    'ausente',
    'enfermo',
    'permiso',
    'descanso',
    'n/a',
    '-',
    ''
  ]
  
  const lower = value.toLowerCase().trim()
  return nonWorkValues.includes(lower)
}

function isCombinedFormat(value: string): boolean {
  // Check for patterns like "E:08:55AM - S:06:00PM" or "08:55 - 18:00"
  const combinedPatterns = [
    /^E:\d{1,2}:\d{2}/i,
    /-\s*S:\d{1,2}:\d{2}/i,
    /\d{1,2}:\d{2}\s*[-–>a]\s*\d{1,2}:\d{2}/i
  ]
  
  return combinedPatterns.some(p => p.test(value.trim()))
}

function parseStandardDate(value: string): string | null {
  // Try various date formats
  const patterns = [
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, format: 'YYYY-MM-DD' },
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, format: 'DD/MM/YYYY' },
    { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, format: 'DD-MM-YYYY' },
    { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, format: 'DD.MM.YYYY' },
  ]
  
  for (const { regex } of patterns) {
    const match = value.match(regex)
    if (match) {
      if (match[1].length === 4) {
        // YYYY-MM-DD
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
      } else {
        // DD/MM/YYYY or similar
        const day = match[1].padStart(2, '0')
        const month = match[2].padStart(2, '0')
        const year = match[3].length === 2 ? `20${match[3]}` : match[3]
        return `${year}-${month}-${day}`
      }
    }
  }
  
  return null
}

function parseSingleTime(value: string): string | null {
  const trimmed = value.trim()
  
  // Match HH:MM with optional AM/PM
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?$/i)
  if (!match) return null
  
  let hour = parseInt(match[1])
  const min = match[2]
  const ampm = match[3]?.toUpperCase()
  
  // Convert to 24h
  if (ampm === 'PM' && hour !== 12) hour += 12
  if (ampm === 'AM' && hour === 12) hour = 0
  
  return `${hour.toString().padStart(2, '0')}:${min}`
}

function formatFullName(name: string): string {
  if (!name) return ''
  
  // Handle "Apellido Nombre" format
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return parts
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(' ')
  }
  
  return name.trim()
}
