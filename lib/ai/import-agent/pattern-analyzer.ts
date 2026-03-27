import { DATE_FORMATS_TO_DETECT, TIME_FORMATS_TO_DETECT, EMAIL_PATTERN } from './schema'

export interface ColumnPattern {
  columnName: string
  columnIndex: number
  detectedType: 'date' | 'time' | 'email' | 'name' | 'id' | 'unknown'
  confidence: number
  pattern: string | null
  sampleValues: string[]
  isCombinedEntryExit?: boolean
}

export interface DataPatterns {
  columns: ColumnPattern[]
  dateFormat: string | null
  timeFormat: string | null
  hasCombinedEntryExit: boolean
  formatType: 'horizontal' | 'vertical' | 'unknown'
  dateColumns: Array<{
    date: string
    dateNormalized: string
    columnName: string
  }>
  employeeIdentifier: {
    nameColumns: string[]
    emailColumns: string[]
    idColumns: string[]
  }
}

const MONTH_ABBREVIATIONS: Record<string, string> = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
  jan: '01', apr: '04', aug: '08', dec: '12'
}

export function analyzeDataPatterns(
  headers: string[],
  rows: Record<string, string>[]
): DataPatterns {
  console.log('[PatternAnalyzer] Analyzing', headers.length, 'columns and', rows.length, 'rows')
  
  const columns: ColumnPattern[] = []
  let hasCombinedEntryExit = false
  let dateFormat: string | null = null
  let timeFormat: string | null = null
  
  // Analyze each column
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]
    const allValues = rows.map(row => row[header]).filter(Boolean)
    
    if (allValues.length === 0) {
      columns.push({
        columnName: header,
        columnIndex: i,
        detectedType: 'unknown',
        confidence: 0,
        pattern: null,
        sampleValues: []
      })
      continue
    }
    
    // Detect column type by analyzing VALUES
    const analysis = analyzeColumnValues(header, allValues)
    columns.push(analysis)
    
    if (analysis.isCombinedEntryExit) {
      hasCombinedEntryExit = true
    }
    if (analysis.detectedType === 'date' && !dateFormat) {
      dateFormat = analysis.pattern
    }
    if (analysis.detectedType === 'time' && !timeFormat) {
      timeFormat = analysis.pattern
    }
  }
  
  // Detect format type (horizontal vs vertical)
  const formatType = detectFormatType(headers, columns, rows)
  
  // Extract date columns for horizontal format
  const dateColumns = extractDateColumns(headers, columns, rows)
  
  // Identify employee columns
  const employeeIdentifier = identifyEmployeeColumns(headers, columns)
  
  console.log('[PatternAnalyzer] Format type:', formatType)
  console.log('[PatternAnalyzer] Has combined entry-exit:', hasCombinedEntryExit)
  console.log('[PatternAnalyzer] Date columns found:', dateColumns.length)
  
  return {
    columns,
    dateFormat,
    timeFormat,
    hasCombinedEntryExit,
    formatType,
    dateColumns,
    employeeIdentifier
  }
}

function analyzeColumnValues(header: string, values: string[]): ColumnPattern {
  const sampleValues = values.slice(0, 20)
  const headerLower = header.toLowerCase()
  
  // Check for email
  const emailMatches = values.filter(v => EMAIL_PATTERN.test(v.trim())).length
  const emailRatio = emailMatches / values.length
  if (emailRatio > 0.3 || headerLower.includes('email') || headerLower.includes('correo')) {
    return {
      columnName: header,
      columnIndex: 0,
      detectedType: 'email',
      confidence: Math.min(emailRatio * 2, 1),
      pattern: 'email',
      sampleValues: sampleValues.slice(0, 5)
    }
  }
  
  // Check for combined entry-exit pattern (E:08:55AM - S:06:00PM)
  const combinedPattern = /^E:\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\s*[-–]\s*S:\d{1,2}:\d{2}\s*(AM|PM|am|pm)?$/i
  const combinedMatches = values.filter(v => combinedPattern.test(v.trim())).length
  const combinedRatio = combinedMatches / values.length
  
  if (combinedRatio > 0.1) {
    return {
      columnName: header,
      columnIndex: 0,
      detectedType: 'time',
      confidence: Math.min(combinedRatio * 3, 1),
      pattern: 'E:HH:MM - S:HH:MM',
      sampleValues: sampleValues.slice(0, 5),
      isCombinedEntryExit: true
    }
  }
  
  // Check for date patterns in VALUES
  let datePattern: string | null = null
  let dateScore = 0
  
  for (const fmt of DATE_FORMATS_TO_DETECT) {
    if (!('pattern' in fmt)) continue
    const dateFmt = fmt as { pattern: RegExp; format: string }
    const matches = values.filter(v => dateFmt.pattern.test(v.trim())).length
    const ratio = matches / values.length
    if (ratio > 0.1 && ratio > dateScore) {
      dateScore = ratio
      datePattern = dateFmt.format
    }
  }
  
  // Also check header for month abbreviation format (Mar-16, Jan-15)
  const monthAbbrPattern = /^(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s]\d{1,2}$/i
  if (monthAbbrPattern.test(header.trim()) || datePattern === 'MMM-DD') {
    dateScore = 0.9
    datePattern = 'MMM-DD'
  }
  
  if (dateScore > 0.1 || headerLower.includes('fecha') || headerLower.includes('date') || headerLower.includes('dia')) {
    return {
      columnName: header,
      columnIndex: 0,
      detectedType: 'date',
      confidence: Math.min(dateScore * 2, 1),
      pattern: datePattern,
      sampleValues: sampleValues.slice(0, 5)
    }
  }
  
  // Check for time patterns in VALUES
  let timePattern: string | null = null
  let timeScore = 0
  
  for (const fmt of TIME_FORMATS_TO_DETECT) {
    if (!('pattern' in fmt)) continue
    const timeFmt = fmt as { pattern: RegExp; format: string }
    const matches = values.filter(v => timeFmt.pattern.test(v.trim())).length
    const ratio = matches / values.length
    if (ratio > 0.1 && ratio > timeScore) {
      timeScore = ratio
      timePattern = timeFmt.format
    }
  }
  
  if (timeScore > 0.1 || headerLower.includes('entrada') || headerLower.includes('salida') || 
      headerLower.includes('clock') || headerLower.includes('in') || headerLower.includes('out')) {
    return {
      columnName: header,
      columnIndex: 0,
      detectedType: 'time',
      confidence: Math.min(timeScore * 2, 1),
      pattern: timePattern,
      sampleValues: sampleValues.slice(0, 5)
    }
  }
  
  // Check for name patterns
  const namePatterns = [/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/, /^[^@]+$/]
  const nameMatches = values.filter(v => namePatterns[0].test(v.trim()) && !v.includes('@')).length
  const nameRatio = nameMatches / values.length
  
  if (nameRatio > 0.3 || headerLower.includes('nombre') || headerLower.includes('name') || 
      headerLower.includes('empleado') || headerLower.includes('apellido')) {
    return {
      columnName: header,
      columnIndex: 0,
      detectedType: 'name',
      confidence: Math.min(nameRatio * 2, 1),
      pattern: 'full_name',
      sampleValues: sampleValues.slice(0, 5)
    }
  }
  
  // Check for ID patterns (EMP-101, LEG-001, etc.)
  const idPattern = /^[A-Z]{2,4}[-]?\d{3,6}$/i
  const idMatches = values.filter(v => idPattern.test(v.trim())).length
  const idRatio = idMatches / values.length
  
  if (idRatio > 0.3 || headerLower.includes('legajo') || headerLower.includes('id') || headerLower.includes('codigo')) {
    return {
      columnName: header,
      columnIndex: 0,
      detectedType: 'id',
      confidence: Math.min(idRatio * 2, 1),
      pattern: 'employee_id',
      sampleValues: sampleValues.slice(0, 5)
    }
  }
  
  return {
    columnName: header,
    columnIndex: 0,
    detectedType: 'unknown',
    confidence: 0,
    pattern: null,
    sampleValues: sampleValues.slice(0, 5)
  }
}

function detectFormatType(
  headers: string[], 
  columns: ColumnPattern[],
  rows: Record<string, string>[]
): 'horizontal' | 'vertical' | 'unknown' {
  // Horizontal format: dates in headers (column names contain dates)
  // Vertical format: dates in cells
  
  const dateColumns = columns.filter(c => c.detectedType === 'date')
  
  // Check if headers contain date patterns
  const headerHasDates = headers.some(h => {
    const monthAbbr = /^(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s]\d{1,2}$/i.test(h.trim())
    const fullDate = /^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom|Lun|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/i.test(h.trim())
    const dateNum = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/i.test(h.trim())
    return monthAbbr || dateNum || fullDate
  })
  
  // Check if there are date columns detected
  const cellHasDates = dateColumns.length > 0
  
  if (headerHasDates && !cellHasDates) {
    return 'horizontal'
  }
  
  if (cellHasDates && !headerHasDates) {
    return 'vertical'
  }
  
  // Check for combined entry-exit columns (suggests horizontal)
  const combinedColumns = columns.filter(c => c.isCombinedEntryExit)
  if (combinedColumns.length > 0 && headerHasDates) {
    return 'horizontal'
  }
  
  // Default to horizontal if we have date-like headers
  if (headerHasDates) {
    return 'horizontal'
  }
  
  return 'unknown'
}

function extractDateColumns(
  headers: string[],
  columns: ColumnPattern[],
  rows: Record<string, string>[]
): Array<{ date: string; dateNormalized: string; columnName: string }> {
  const dateCols: Array<{ date: string; dateNormalized: string; columnName: string }> = []
  
  for (const header of headers) {
    const headerTrimmed = header.trim()
    
    // Check for month abbreviation format: Mar-16, Jan-15
    const monthAbbrMatch = headerTrimmed.match(/^(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s](\d{1,2})$/i)
    
    if (monthAbbrMatch) {
      const monthAbbr = monthAbbrMatch[1].toLowerCase()
      const day = monthAbbrMatch[2].padStart(2, '0')
      const month = MONTH_ABBREVIATIONS[monthAbbr] || '01'
      const year = new Date().getFullYear()
      
      dateCols.push({
        date: headerTrimmed,
        dateNormalized: `${year}-${month}-${day}`,
        columnName: header
      })
      continue
    }
    
    // Check for standard date format in header
    const dateMatch = headerTrimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
    
    if (dateMatch) {
      let day: string, month: string, year: string
      
      // Assume DD/MM/YYYY or DD-MM-YYYY
      day = dateMatch[1].padStart(2, '0')
      month = dateMatch[2].padStart(2, '0')
      year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]
      
      dateCols.push({
        date: headerTrimmed,
        dateNormalized: `${year}-${month}-${day}`,
        columnName: header
      })
      continue
    }

    // Check for full date format: Mon Mar 16, Tuesday March 16
    const fullDateMatch = headerTrimmed.match(/^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom|Lun|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i)
    
    if (fullDateMatch) {
      const monthAbbr = fullDateMatch[2].toLowerCase()
      const day = fullDateMatch[3].padStart(2, '0')
      const month = MONTH_ABBREVIATIONS[monthAbbr] || '01'
      const year = new Date().getFullYear()
      
      dateCols.push({
        date: headerTrimmed,
        dateNormalized: `${year}-${month}-${day}`,
        columnName: header
      })
    }
  }
  
  return dateCols
}

function identifyEmployeeColumns(
  headers: string[],
  columns: ColumnPattern[]
): { nameColumns: string[]; emailColumns: string[]; idColumns: string[] } {
  const nameColumns: string[] = []
  const emailColumns: string[] = []
  const idColumns: string[] = []
  
  for (const col of columns) {
    const headerLower = col.columnName.toLowerCase()
    
    if (col.detectedType === 'email' || headerLower.includes('email') || headerLower.includes('correo')) {
      emailColumns.push(col.columnName)
    } else if (col.detectedType === 'name' || headerLower.includes('nombre') || 
               headerLower.includes('name') || headerLower.includes('apellido')) {
      nameColumns.push(col.columnName)
    } else if (col.detectedType === 'id' || headerLower.includes('legajo') || 
               headerLower.includes('codigo') || headerLower.includes('id')) {
      idColumns.push(col.columnName)
    }
  }
  
  return { nameColumns, emailColumns, idColumns }
}

export function parseMonthAbbrDate(value: string): { normalized: string | null; year: number } | null {
  const currentYear = new Date().getFullYear()
  
  // Try Mar-16 format
  const match1 = value.match(/^(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s](\d{1,2})$/i)
  if (match1) {
    const monthAbbr = match1[1].toLowerCase()
    const day = match1[2].padStart(2, '0')
    const month = MONTH_ABBREVIATIONS[monthAbbr]
    if (month) {
      return {
        normalized: `${currentYear}-${month}-${day}`,
        year: currentYear
      }
    }
  }
  
  return null
}

export function parseCombinedTime(value: string): { clockIn: string | null; clockOut: string | null } {
  // Pattern: E:08:55AM - S:06:00PM
  const combinedPattern = /^E:(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\s*[-–]\s*S:(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i
  const match = value.match(combinedPattern)
  
  if (match) {
    let inHour = parseInt(match[1])
    const inMin = match[2]
    const inAmpm = match[3]?.toUpperCase() || ''
    let outHour = parseInt(match[4])
    const outMin = match[5]
    const outAmpm = match[6]?.toUpperCase() || ''
    
    // Convert to 24h
    if (inAmpm === 'PM' && inHour !== 12) inHour += 12
    if (inAmpm === 'AM' && inHour === 12) inHour = 0
    if (outAmpm === 'PM' && outHour !== 12) outHour += 12
    if (outAmpm === 'AM' && outHour === 12) outHour = 0
    
    return {
      clockIn: `${inHour.toString().padStart(2, '0')}:${inMin}`,
      clockOut: `${outHour.toString().padStart(2, '0')}:${outMin}`
    }
  }
  
  // Try simpler pattern: HH:MM - HH:MM or HH:MM a HH:MM
  const rangePattern = /^(\d{1,2}):(\d{2})\s*[-–>a]\s*(\d{1,2}):(\d{2})$/i
  const rangeMatch = value.match(rangePattern)
  
  if (rangeMatch) {
    return {
      clockIn: `${rangeMatch[1].padStart(2, '0')}:${rangeMatch[2]}`,
      clockOut: `${rangeMatch[3].padStart(2, '0')}:${rangeMatch[4]}`
    }
  }
  
  // Try just extracting times
  const timePattern = /(\d{1,2}):(\d{2})/g
  const times = value.match(timePattern)
  
  if (times && times.length >= 2) {
    return {
      clockIn: times[0],
      clockOut: times[1]
    }
  }
  
  return { clockIn: null, clockOut: null }
}
