export interface FormatDetectionResult {
  type: 'horizontal' | 'vertical' | 'unknown'
  confidence: number
  employeeIdentifier?: {
    nameColumns: string[]
    emailColumns: string[]
  }
  dateColumns?: DateColumnPair[]
  dateColumn?: string
  clockInColumn?: string
  clockOutColumn?: string
  message?: string
}

export interface DateColumnPair {
  date: string
  dateNormalized: string
  entradaColumn: string
  salidaColumn: string
}

export interface TransformedRecord {
  email: string
  fullName: string
  date: string
  clockIn: string
  clockOut: string
  rawData: Record<string, string>
  isValid: boolean
  errors: string[]
}
