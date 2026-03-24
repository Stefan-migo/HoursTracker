import type { ColumnMapping } from '@/lib/import/types'

interface DetectionPattern {
  field: string
  patterns: string[]
  type: 'email' | 'date' | 'time' | 'text'
}

const FIELD_PATTERNS: DetectionPattern[] = [
  {
    field: 'email',
    patterns: ['email', 'correo', 'mail', 'e-mail', 'correo_electronico', 'correo electronico', 'email_address'],
    type: 'email'
  },
  {
    field: 'date',
    patterns: ['fecha', 'date', 'dia', 'día', 'fecha_registro', 'fecha registro', 'work_date', 'fecha_trabajo'],
    type: 'date'
  },
  {
    field: 'clockIn',
    patterns: ['entrada', 'clock_in', 'clock in', 'hora_entrada', 'hora entrada', 'in', 'start', 'inicio', 'hora_inicio', 'check_in'],
    type: 'time'
  },
  {
    field: 'clockOut',
    patterns: ['salida', 'clock_out', 'clock out', 'hora_salida', 'hora salida', 'out', 'end', 'fin', 'hora_fin', 'check_out'],
    type: 'time'
  },
  {
    field: 'fullName',
    patterns: ['nombre', 'name', 'full_name', 'full name', 'nombre_completo', 'nombre completo', 'empleado', 'employee', 'worker'],
    type: 'text'
  },
  {
    field: 'notes',
    patterns: ['notas', 'notes', 'comentarios', 'comments', 'observaciones', 'observations', 'descripcion', 'description'],
    type: 'text'
  }
]

export class ColumnDetector {
  static detectColumns(headers: string[], sampleRows: Record<string, string>[]): ColumnMapping[] {
    return headers.map(header => {
      const headerLower = header.toLowerCase().trim()
      let bestMatch: { field: string; confidence: number } | null = null

      // Buscar coincidencias exactas o parciales
      for (const pattern of FIELD_PATTERNS) {
        for (const patternStr of pattern.patterns) {
          const confidence = this.calculateConfidence(headerLower, patternStr.toLowerCase())
          
          if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
            bestMatch = { field: pattern.field, confidence }
          }
        }
      }

      // Obtener valores de muestra
      const sampleValues = sampleRows
        .slice(0, 5)
        .map(row => row[header] || '')
        .filter(v => v !== '')

      return {
        sourceColumn: header,
        targetField: bestMatch?.field || null,
        confidence: bestMatch?.confidence || 0,
        sampleValues
      }
    })
  }

  private static calculateConfidence(header: string, pattern: string): number {
    // Coincidencia exacta
    if (header === pattern) return 1.0
    
    // El header contiene el patrón completo
    if (header.includes(pattern)) return 0.9
    
    // El patrón contiene el header completo
    if (pattern.includes(header)) return 0.8
    
    // Palabras individuales coinciden
    const headerWords = header.split(/[_\s]+/)
    const patternWords = pattern.split(/[_\s]+/)
    const matchingWords = headerWords.filter(hw => 
      patternWords.some(pw => pw.includes(hw) || hw.includes(pw))
    )
    
    if (matchingWords.length > 0) {
      return 0.5 + (matchingWords.length / Math.max(headerWords.length, patternWords.length)) * 0.3
    }
    
    return 0
  }

  static getUnmappedColumns(mappings: ColumnMapping[]): ColumnMapping[] {
    return mappings.filter(m => m.targetField === null || m.confidence < 0.5)
  }

  static getRequiredFieldMappings(mappings: ColumnMapping[]): { field: string; mapped: boolean }[] {
    const requiredFields = ['email', 'date', 'clockIn', 'clockOut']
    
    return requiredFields.map(field => ({
      field,
      mapped: mappings.some(m => m.targetField === field && m.confidence >= 0.5)
    }))
  }

  static areAllRequiredFieldsMapped(mappings: ColumnMapping[]): boolean {
    const requiredCheck = this.getRequiredFieldMappings(mappings)
    return requiredCheck.every(r => r.mapped)
  }
}
