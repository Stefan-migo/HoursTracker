export type DateFormat =
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD'
  | 'DD-MM-YYYY'
  | 'DD.MM.YYYY'
  | 'DD_MM_YYYY'
  | 'YYYY/MM/DD'
  | 'text' // "16 de marzo 2026", "March 16, 2026"
  | 'excel_serial'
  | 'unknown'

export type TimeFormat =
  | 'HH:MM'
  | 'HH:MM:SS'
  | 'H:MM'
  | 'H:MM:SS'
  | '12h_AM_PM' // "8:55 AM", "5:30 PM"
  | 'decimal_excel' // 0.354167
  | 'text' // "8h 30", "8 horas 30 minutos"
  | 'unknown'

export type FileFormatType = 'horizontal' | 'vertical' | 'unknown'

export type TargetField = 'email' | 'date' | 'clock_in' | 'clock_out' | 'full_name' | 'notes'

export interface ColumnAnalysis {
  sourceColumn: string
  detectedType: 'email' | 'date' | 'time' | 'text' | 'unknown'
  detectedFormat?: DateFormat | TimeFormat
  sampleValues: string[]
  confidence: number
  reasoning: string
}

export interface ColumnMapping {
  sourceColumn: string
  targetField: TargetField | null
  confidence: number
  sampleTransformed: string | null
  reasoning: string
}

export interface FormatDetection {
  type: FileFormatType
  confidence: number
  reasoning: string
  dateColumn?: string
  clockInColumn?: string
  clockOutColumn?: string
  horizontalDateColumns?: DateColumnPair[]
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
  isValid: boolean
  issues: string[]
  rawData: Record<string, string>
}

export interface ImportAgentRequest {
  headers: string[]
  rows: Record<string, string>[]
  options?: {
    skipWeekends?: boolean
    skipEmptyHours?: boolean
    validateEmail?: boolean
  }
}

export interface ImportAgentResponse {
  success: boolean
  format: FormatDetection
  columnMappings: ColumnMapping[]
  transformedRecords: TransformedRecord[]
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    issuesFound: number
  }
  recommendations: string[]
  error?: string
}

export interface LLMFunctionResult {
  success: boolean
  result?: unknown
  error?: string
}
