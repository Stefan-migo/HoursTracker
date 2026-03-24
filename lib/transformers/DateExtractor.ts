/**
 * Extrae y parsea fechas en múltiples formatos
 */
export class DateExtractor {
  /**
   * Parsea una fecha en múltiples formatos y devuelve ISO (YYYY-MM-DD)
   * Soporta: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.
   */
  static parse(dateStr: string): string | null {
    if (!dateStr) return null
    
    const str = dateStr.toString().trim()
    
    // 1. Intentar parsear como fecha de Excel (número serial)
    const excelNumber = parseFloat(str)
    if (!isNaN(excelNumber) && excelNumber > 1 && excelNumber < 50000) {
      // Excel cuenta días desde 1900-01-01 (aproximadamente)
      // Pero es más seguro intentar convertir usando Date
      const excelEpoch = new Date(1899, 11, 30) // 30 Dec 1899
      const date = new Date(excelEpoch.getTime() + excelNumber * 24 * 60 * 60 * 1000)
      if (!isNaN(date.getTime())) {
        return this.toISODate(date)
      }
    }
    
    // 2. Formato DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
    const ddmmyyyyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/
    const ddmmMatch = str.match(ddmmyyyyPattern)
    if (ddmmMatch) {
      const day = parseInt(ddmmMatch[1])
      const month = parseInt(ddmmMatch[2])
      const year = parseInt(ddmmMatch[3])
      
      if (this.isValidDate(day, month, year)) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      }
    }
    
    // 3. Formato DD/MM/YY o DD-MM-YY (año de 2 dígitos)
    const ddmmyyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/
    const ddmmyyMatch = str.match(ddmmyyPattern)
    if (ddmmyyMatch) {
      let day = parseInt(ddmmyyMatch[1])
      let month = parseInt(ddmmyyMatch[2])
      let year = parseInt(ddmmyyMatch[3])
      
      // Asumir siglo 20 o 21 según el año
      year = year < 50 ? 2000 + year : 1900 + year
      
      if (this.isValidDate(day, month, year)) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      }
    }
    
    // 4. Formato MM/DD/YYYY (US)
    const mmddyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    const mmddMatch = str.match(mmddyyyyPattern)
    if (mmddMatch) {
      // Asumimos DD/MM/YYYY primero, si no es válido probar MM/DD/YYYY
      let day = parseInt(mmddMatch[1])
      let month = parseInt(mmddMatch[2])
      const year = parseInt(mmddMatch[3])
      
      if (!this.isValidDate(day, month, year)) {
        // Probar al revés (MM/DD)
        day = parseInt(mmddMatch[2])
        month = parseInt(mmddMatch[1])
      }
      
      if (this.isValidDate(day, month, year)) {
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      }
    }
    
    // 5. Formato YYYY-MM-DD (ya está en formato ISO)
    const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/
    const isoMatch = str.match(isoPattern)
    if (isoMatch) {
      const year = parseInt(isoMatch[1])
      const month = parseInt(isoMatch[2])
      const day = parseInt(isoMatch[3])
      
      if (this.isValidDate(day, month, year)) {
        return str
      }
    }
    
    // 6. Intentar con Date.parse
    try {
      const date = new Date(str)
      if (!isNaN(date.getTime())) {
        return this.toISODate(date)
      }
    } catch {
      // Ignorar errores
    }
    
    return null
  }
  
  /**
   * Extrae fecha de un string que contiene fecha y texto adicional
   * Ej: "16/03/2026 Entrada" → "2026-03-16"
   */
  static extractFromString(str: string): string | null {
    if (!str) return null
    
    // Buscar patrón de fecha DD/MM/YYYY o similar
    const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/
    const match = str.match(datePattern)
    
    if (match) {
      return this.parse(match[1])
    }
    
    return null
  }
  
  /**
   * Convierte Date a string ISO (YYYY-MM-DD)
   */
  private static toISODate(date: Date): string {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  /**
   * Valida si una fecha es válida
   */
  private static isValidDate(day: number, month: number, year: number): boolean {
    if (month < 1 || month > 12) return false
    if (day < 1 || day > 31) return false
    if (year < 1900 || year > 2100) return false
    
    // Verificar días por mes
    const daysInMonth = new Date(year, month, 0).getDate()
    if (day > daysInMonth) return false
    
    return true
  }
  
  /**
   * Formatea fecha ISO para display
   */
  static formatDisplay(isoDate: string): string {
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}/${year}`
  }
}
