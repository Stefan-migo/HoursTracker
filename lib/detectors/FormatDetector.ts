import type { FormatDetectionResult, DateColumnPair } from '../transformers/types'

export class FormatDetector {
  /**
   * Detecta el formato del archivo analizando los headers
   */
  static detect(headers: string[]): FormatDetectionResult {
    // 1. Detectar formato horizontal (fechas en headers)
    const horizontalResult = this.detectHorizontalFormat(headers)
    if (horizontalResult.confidence > 0.7) {
      return horizontalResult
    }

    // 2. Detectar formato vertical (fechas en columna)
    const verticalResult = this.detectVerticalFormat(headers)
    if (verticalResult.confidence > 0.7) {
      return verticalResult
    }

    // 3. Si no se detecta claramente, devolver unknown con sugerencias
    return {
      type: 'unknown',
      confidence: 0,
      message: 'No se pudo detectar el formato automáticamente. Por favor selecciona el formato manualmente.'
    }
  }

  /**
   * Detecta formato horizontal: fechas en nombres de columna
   * Ej: "16/03/2026 Entrada", "16/03/2026 Salida", "Mar-16", "Jan-15", "Mon Mar 16"
   */
  private static detectHorizontalFormat(headers: string[]): FormatDetectionResult {
    // Patrón para detectar fechas en headers: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, etc.
    const datePattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\s*(.+)?$/i
    
    // Pattern for month abbreviation format: Mar-16, Jan-15, Feb-20
    const monthAbbrPattern = /^(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s](\d{1,2})$/i
    
    // Pattern for full date format: Mon Mar 16, Tuesday March 16
    const fullDatePattern = /^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom|Lun|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})/i
    
    const dateColumns: DateColumnPair[] = []
    const entradaPattern = /entrada|clock.?in|^e$|^in$/i
    const salidaPattern = /salida|clock.?out|^s$|^out$/i
    
    // Buscar columnas que contengan fechas (standard format)
    const dateHeaders = headers.filter(h => datePattern.test(h.trim()))
    
    // Check for month abbreviation format
    const monthAbbrHeaders = headers.filter(h => monthAbbrPattern.test(h.trim()))
    
    // Check for full date format
    const fullDateHeaders = headers.filter(h => fullDatePattern.test(h.trim()))
    
    const totalDateHeaders = dateHeaders.length + monthAbbrHeaders.length + fullDateHeaders.length
    
    if (totalDateHeaders < 2) {
      return {
        type: 'horizontal',
        confidence: 0,
        message: 'No se detectaron suficientes columnas con fechas'
      }
    }

    // Agrupar por fecha
    const dateGroups = new Map<string, { entrada?: string; salida?: string }>()
    
    for (const header of dateHeaders) {
      const match = header.trim().match(datePattern)
      if (!match) continue
      
      const [, day, month, year, suffix] = match
      const fullYear = year.length === 2 ? `20${year}` : year
      const normalizedDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      
      if (!dateGroups.has(normalizedDate)) {
        dateGroups.set(normalizedDate, {})
      }
      
      const group = dateGroups.get(normalizedDate)!
      const suffixLower = (suffix || '').toLowerCase().trim()
      
      if (entradaPattern.test(suffixLower) || (!group.entrada && !suffixLower)) {
        group.entrada = header
      } else if (salidaPattern.test(suffixLower) || (!group.salida && !suffixLower)) {
        group.salida = header
      }
    }

    // Crear pares de columnas
    for (const [date, group] of dateGroups) {
      if (group.entrada && group.salida) {
        dateColumns.push({
          date: this.formatDisplayDate(date),
          dateNormalized: date,
          entradaColumn: group.entrada,
          salidaColumn: group.salida
        })
      }
    }

    // NEW: Process month abbreviation headers (Mar-16, Jan-15)
    // These have combined entry-exit in the same cell
    const monthAbbrMap: Record<string, string> = {
      ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
      jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
      jan: '01', apr: '04', aug: '08', dec: '12'
    }
    
    for (const header of monthAbbrHeaders) {
      const match = header.trim().match(monthAbbrPattern)
      if (!match) continue
      
      const monthAbbr = match[1].toLowerCase()
      const day = match[2].padStart(2, '0')
      const month = monthAbbrMap[monthAbbr] || '01'
      const year = new Date().getFullYear()
      const normalizedDate = `${year}-${month}-${day}`
      
      // For month abbreviation format, entrada and salida are the same column
      // because the cell contains "E:08:55AM - S:06:00PM"
      dateColumns.push({
        date: `${day}/${month}/${year}`,
        dateNormalized: normalizedDate,
        entradaColumn: header,
        salidaColumn: header // Same column for combined format
      })
    }

    // NEW: Process full date format (Mon Mar 16, Tuesday March 16)
    for (const header of fullDateHeaders) {
      const match = header.trim().match(fullDatePattern)
      if (!match) continue
      
      const monthAbbr = match[2].toLowerCase()
      const day = match[3].padStart(2, '0')
      const month = monthAbbrMap[monthAbbr] || '01'
      const year = new Date().getFullYear()
      const normalizedDate = `${year}-${month}-${day}`
      
      dateColumns.push({
        date: `${day}/${month}/${year}`,
        dateNormalized: normalizedDate,
        entradaColumn: header,
        salidaColumn: header // Same column for combined format
      })
    }

    if (dateColumns.length === 0) {
      return {
        type: 'horizontal',
        confidence: 0,
        message: 'Se detectaron fechas en headers pero no se pudieron emparejar Entrada/Salida'
      }
    }

    // Detectar columnas de identificación
    const employeeIdentifier = this.detectEmployeeColumns(headers)

    // Calcular confianza
    const totalDateGroups = dateGroups.size
    const completePairs = dateColumns.length
    const confidence = totalDateGroups > 0 ? (completePairs / totalDateGroups) * 0.9 + 0.1 : 0

    return {
      type: 'horizontal',
      confidence: Math.min(confidence, 0.95),
      employeeIdentifier,
      dateColumns,
      message: `Detectado formato horizontal con ${dateColumns.length} días laborables`
    }
  }

  /**
   * Detecta formato vertical: columna de fechas
   * Ej: Columna "Fecha" con valores "16/03/2026"
   */
  private static detectVerticalFormat(headers: string[]): FormatDetectionResult {
    const datePatterns = [
      /^fecha|date$/i,
      /^dia|day$/i,
      /^fecha.*registro|work.*date/i
    ]
    
    const clockInPatterns = [
      /^entrada|clock.?in/i,
      /^hora.*entrada|in$/i
    ]
    
    const clockOutPatterns = [
      /^salida|clock.?out/i,
      /^hora.*salida|out$/i
    ]

    let dateColumn: string | undefined
    let clockInColumn: string | undefined
    let clockOutColumn: string | undefined

    // Buscar columnas
    for (const header of headers) {
      const headerLower = header.toLowerCase()
      
      if (!dateColumn && datePatterns.some(p => p.test(headerLower))) {
        dateColumn = header
      }
      if (!clockInColumn && clockInPatterns.some(p => p.test(headerLower))) {
        clockInColumn = header
      }
      if (!clockOutColumn && clockOutPatterns.some(p => p.test(headerLower))) {
        clockOutColumn = header
      }
    }

    // Calcular confianza
    let confidence = 0
    if (dateColumn) confidence += 0.3
    if (clockInColumn) confidence += 0.35
    if (clockOutColumn) confidence += 0.35

    if (confidence < 0.5) {
      return {
        type: 'vertical',
        confidence,
        message: 'Formato vertical detectado parcialmente'
      }
    }

    const employeeIdentifier = this.detectEmployeeColumns(headers)

    return {
      type: 'vertical',
      confidence: Math.min(confidence, 0.95),
      employeeIdentifier,
      dateColumn,
      clockInColumn,
      clockOutColumn,
      message: 'Detectado formato vertical estándar'
    }
  }

  /**
   * Detecta columnas de identificación del empleado
   */
  private static detectEmployeeColumns(headers: string[]): { nameColumns: string[]; emailColumns: string[] } {
    const namePatterns = [
      /^nombre|name|full.*name|empleado|trabajador|worker|employee$/i,
      /^apellido|last.*name|surname$/i
    ]
    
    const emailPatterns = [
      /^email|correo|e-?mail|mail$/i,
      /^correo.*electronico|electronic.*mail/i
    ]

    const nameColumns: string[] = []
    const emailColumns: string[] = []

    for (const header of headers) {
      const headerLower = header.toLowerCase()
      
      if (namePatterns.some(p => p.test(headerLower))) {
        nameColumns.push(header)
      }
      if (emailPatterns.some(p => p.test(headerLower))) {
        emailColumns.push(header)
      }
    }

    return { nameColumns, emailColumns }
  }

  /**
   * Formatea fecha para display
   */
  private static formatDisplayDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}/${year}`
  }
}
