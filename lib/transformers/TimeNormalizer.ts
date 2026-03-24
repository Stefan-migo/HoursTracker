/**
 * Normaliza diferentes formatos de hora a HH:MM
 */
export class TimeNormalizer {
  /**
   * Valores que indican "no trabajó" y deben ser ignorados
   */
  static readonly SKIP_VALUES = [
    'libre', 'feriado', 'vacaciones', 'licencia', 'descanso',
    'holiday', 'vacation', 'leave', 'rest', 'day off',
    '-', 'n/a', 'na', 'none', 'null', 'empty'
  ]

  /**
   * Normaliza una hora a formato HH:MM
   * Soporta: H:MM, HH:MM, HH:MM:SS, decimal (Excel), 12h (AM/PM)
   */
  static normalize(timeStr: string | number): string | null {
    if (!timeStr && timeStr !== 0) return null
    
    const str = String(timeStr).trim()
    
    // Verificar si es valor a ignorar
    if (this.shouldSkip(str)) {
      return null
    }

    // 1. Formato H:MM o HH:MM (ej: "8:55", "08:55")
    const hmPattern = /^(\d{1,2}):(\d{2})(?::\d{2})?$/
    const hmMatch = str.match(hmPattern)
    if (hmMatch) {
      const [, hours, minutes] = hmMatch
      const h = parseInt(hours)
      const m = parseInt(minutes)
      
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${hours.padStart(2, '0')}:${minutes}`
      }
    }

    // 2. Formato 12h con AM/PM (ej: "8:55 AM", "6:00 PM")
    const ampmPattern = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
    const ampmMatch = str.match(ampmPattern)
    if (ampmMatch) {
      let [, hours, minutes, period] = ampmMatch
      let h = parseInt(hours)
      const m = parseInt(minutes)
      
      if (period.toUpperCase() === 'PM' && h !== 12) {
        h += 12
      } else if (period.toUpperCase() === 'AM' && h === 12) {
        h = 0
      }
      
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${h.toString().padStart(2, '0')}:${minutes}`
      }
    }

    // 3. Formato decimal de Excel (ej: 0.354167 = 8:30 AM)
    // En Excel, 1 día = 1.0, entonces 0.354167 = 8:30:00 AM
    const decimalPattern = /^\d*\.?\d+$/
    if (decimalPattern.test(str)) {
      const decimal = parseFloat(str)
      if (!isNaN(decimal) && decimal >= 0 && decimal < 1) {
        const totalMinutes = Math.round(decimal * 24 * 60)
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        }
      }
    }

    // 4. Solo hora (ej: "9", "14")
    const hourOnlyPattern = /^(\d{1,2})$/
    const hourMatch = str.match(hourOnlyPattern)
    if (hourMatch) {
      const h = parseInt(hourMatch[1])
      if (h >= 0 && h <= 23) {
        return `${h.toString().padStart(2, '0')}:00`
      }
    }

    // 5. Intentar parsear como Date
    try {
      const date = new Date(str)
      if (!isNaN(date.getTime())) {
        const hours = date.getHours()
        const minutes = date.getMinutes()
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      }
    } catch {
      // Ignorar errores de parseo
    }

    return null
  }

  /**
   * Verifica si un valor debe ser ignorado (Libre, Feriado, etc.)
   */
  static shouldSkip(value: string): boolean {
    if (!value) return true
    const normalized = value.toString().trim().toLowerCase()
    return this.SKIP_VALUES.includes(normalized) || normalized === ''
  }

  /**
   * Valida si un string es una hora válida
   */
  static isValidTime(value: string | number): boolean {
    return this.normalize(value) !== null
  }

  /**
   * Calcula la diferencia en horas entre dos tiempos
   */
  static calculateHours(start: string, end: string): number {
    const startNormalized = this.normalize(start)
    const endNormalized = this.normalize(end)
    
    if (!startNormalized || !endNormalized) {
      return 0
    }

    const [startH, startM] = startNormalized.split(':').map(Number)
    const [endH, endM] = endNormalized.split(':').map(Number)
    
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM
    
    const diffMinutes = endMinutes - startMinutes
    return Math.round((diffMinutes / 60) * 100) / 100
  }
}
