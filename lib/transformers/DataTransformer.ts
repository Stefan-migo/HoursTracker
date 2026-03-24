import { FormatDetector } from '../detectors/FormatDetector'
import { TimeNormalizer } from './TimeNormalizer'
import { DateExtractor } from './DateExtractor'
import type { FormatDetectionResult, TransformedRecord } from './types'

export interface TransformOptions {
  skipEmptyHours: boolean
  skipWeekends: boolean
  validateEmail: boolean
}

export class DataTransformer {
  private static defaultOptions: TransformOptions = {
    skipEmptyHours: true,
    skipWeekends: false,
    validateEmail: true
  }

  /**
   * Transforma datos del archivo al formato estándar de HoursTracker
   */
  static transform(
    headers: string[],
    rows: Record<string, string>[],
    format: FormatDetectionResult,
    options: Partial<TransformOptions> = {}
  ): TransformedRecord[] {
    const opts = { ...this.defaultOptions, ...options }
    
    switch (format.type) {
      case 'horizontal':
        return this.transformHorizontal(rows, format, opts)
      case 'vertical':
        return this.transformVertical(rows, format, opts)
      default:
        throw new Error('Formato no soportado para transformación')
    }
  }

  /**
   * Transforma formato horizontal (fechas en columnas) a vertical
   */
  private static transformHorizontal(
    rows: Record<string, string>[],
    format: FormatDetectionResult,
    options: TransformOptions
  ): TransformedRecord[] {
    if (!format.dateColumns || format.dateColumns.length === 0) {
      throw new Error('No se encontraron columnas de fecha para transformar')
    }

    const records: TransformedRecord[] = []

    for (const row of rows) {
      // Extraer información del empleado
      const fullName = this.extractEmployeeName(row, format.employeeIdentifier?.nameColumns || [])
      const email = this.extractEmployeeEmail(row, format.employeeIdentifier?.emailColumns || [])

      // Procesar cada día (par de columnas entrada/salida)
      for (const dateCol of format.dateColumns) {
        const entradaRaw = row[dateCol.entradaColumn] || ''
        const salidaRaw = row[dateCol.salidaColumn] || ''

        // Normalizar horas
        const clockIn = TimeNormalizer.normalize(entradaRaw)
        const clockOut = TimeNormalizer.normalize(salidaRaw)

        // Si skipEmptyHours está activo y alguna hora es inválida, ignorar
        if (options.skipEmptyHours && (!clockIn || !clockOut)) {
          continue
        }

        // Validar email si es requerido
        const errors: string[] = []
        if (options.validateEmail && !email) {
          errors.push('Email no proporcionado')
        }

        // Validar que las horas tengan sentido
        if (clockIn && clockOut) {
          const hours = TimeNormalizer.calculateHours(clockIn, clockOut)
          if (hours < 0) {
            errors.push('Hora de salida anterior a hora de entrada')
          }
          if (hours > 24) {
            errors.push('Diferencia de horas mayor a 24')
          }
        }

        records.push({
          email: email || '',
          fullName: fullName || '',
          date: dateCol.dateNormalized,
          clockIn: clockIn || '',
          clockOut: clockOut || '',
          rawData: {
            entradaRaw,
            salidaRaw,
            ...row
          },
          isValid: errors.length === 0 && !!clockIn && !!clockOut && !!email,
          errors
        })
      }
    }

    return records
  }

  /**
   * Transforma formato vertical (ya está en formato correcto, solo normaliza)
   */
  private static transformVertical(
    rows: Record<string, string>[],
    format: FormatDetectionResult,
    options: TransformOptions
  ): TransformedRecord[] {
    if (!format.dateColumn) {
      throw new Error('No se encontró columna de fecha')
    }

    const records: TransformedRecord[] = []

    for (const row of rows) {
      // Extraer fecha
      const dateRaw = row[format.dateColumn] || ''
      const date = DateExtractor.parse(dateRaw)

      // Extraer horas
      const clockInRaw = format.clockInColumn ? row[format.clockInColumn] : ''
      const clockOutRaw = format.clockOutColumn ? row[format.clockOutColumn] : ''
      
      const clockIn = TimeNormalizer.normalize(clockInRaw)
      const clockOut = TimeNormalizer.normalize(clockOutRaw)

      // Extraer información del empleado
      const fullName = this.extractEmployeeName(row, format.employeeIdentifier?.nameColumns || [])
      const email = this.extractEmployeeEmail(row, format.employeeIdentifier?.emailColumns || [])

      // Validaciones
      const errors: string[] = []
      
      if (!date) {
        errors.push(`Fecha inválida: ${dateRaw}`)
      }
      
      if (options.validateEmail && !email) {
        errors.push('Email no proporcionado')
      }

      if (options.skipEmptyHours && (!clockIn || !clockOut)) {
        continue
      }

      if (clockIn && clockOut) {
        const hours = TimeNormalizer.calculateHours(clockIn, clockOut)
        if (hours < 0) {
          errors.push('Hora de salida anterior a hora de entrada')
        }
      }

      records.push({
        email: email || '',
        fullName: fullName || '',
        date: date || '',
        clockIn: clockIn || '',
        clockOut: clockOut || '',
        rawData: row,
        isValid: errors.length === 0 && !!date && !!clockIn && !!clockOut,
        errors
      })
    }

    return records
  }

  /**
   * Extrae el nombre del empleado de las columnas disponibles
   */
  private static extractEmployeeName(
    row: Record<string, string>,
    nameColumns: string[]
  ): string {
    // Intentar columnas detectadas primero
    for (const col of nameColumns) {
      const value = row[col]
      if (value && value.trim()) {
        return value.trim()
      }
    }

    // Buscar cualquier columna que parezca nombre
    const possibleNamePatterns = [
      /^nombre/i,
      /^name/i,
      /^empleado/i,
      /^trabajador/i,
      /^worker/i,
      /^employee/i
    ]

    for (const [key, value] of Object.entries(row)) {
      if (possibleNamePatterns.some(p => p.test(key)) && value && value.trim()) {
        return value.trim()
      }
    }

    return ''
  }

  /**
   * Extrae el email del empleado de las columnas disponibles
   */
  private static extractEmployeeEmail(
    row: Record<string, string>,
    emailColumns: string[]
  ): string {
    // Intentar columnas detectadas primero
    for (const col of emailColumns) {
      const value = row[col]
      if (value && value.trim() && this.isValidEmail(value)) {
        return value.trim().toLowerCase()
      }
    }

    // Buscar cualquier columna que parezca email
    const possibleEmailPatterns = [
      /^email/i,
      /^correo/i,
      /^e-?mail/i,
      /^mail/i
    ]

    for (const [key, value] of Object.entries(row)) {
      if (possibleEmailPatterns.some(p => p.test(key)) && value && this.isValidEmail(value)) {
        return value.trim().toLowerCase()
      }
    }

    return ''
  }

  /**
   * Valida formato de email básico
   */
  private static isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailPattern.test(email.trim())
  }

  /**
   * Obtiene estadísticas de la transformación
   */
  static getStats(records: TransformedRecord[]) {
    const total = records.length
    const valid = records.filter(r => r.isValid).length
    const invalid = total - valid
    
    const skippedByInvalidHours = records.filter(r => 
      !r.clockIn || !r.clockOut
    ).length
    
    const uniqueEmployees = new Set(records.map(r => r.email).filter(Boolean)).size
    const uniqueDates = new Set(records.map(r => r.date).filter(Boolean)).size

    return {
      total,
      valid,
      invalid,
      skippedByInvalidHours,
      uniqueEmployees,
      uniqueDates
    }
  }
}
