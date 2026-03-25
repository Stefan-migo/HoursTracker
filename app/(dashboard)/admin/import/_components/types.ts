export type ImportStep = 1 | 2 | 3 | 4 | 5

export interface ColumnMapping {
  columnIndex: number
  columnName: string
  targetField: ImportField | 'ignore'
  confidence: number
}

export type ImportField = 'email' | 'date' | 'clock_in' | 'clock_out' | 'ignore'

export const IMPORT_FIELDS: { value: ImportField; label: string; required: boolean }[] = [
  { value: 'email', label: 'Correo electrónico', required: true },
  { value: 'date', label: 'Fecha', required: true },
  { value: 'clock_in', label: 'Hora de entrada', required: true },
  { value: 'clock_out', label: 'Hora de salida', required: true },
  { value: 'ignore', label: 'Ignorar columna', required: false },
]

export interface ParsedRow {
  rowIndex: number
  data: Record<string, string>
  isValid: boolean
  errors: string[]
}

export interface WorkerNew {
  email: string
  fullName: string
  create: boolean
  sendInvite: boolean
}

export interface ImportState {
  step: ImportStep
  file: File | null
  fileName: string
  fileFormat: 'xlsx' | 'xls' | 'csv'
  columns: string[]
  mapping: ColumnMapping[]
  rows: ParsedRow[]
  newWorkers: WorkerNew[]
  isAnalyzing: boolean
  isImporting: boolean
  importResult: {
    success: number
    failed: number
    created: number
    invited: number
  } | null
}

export interface ImportResult {
  success: number
  failed: number
  created: number
  invited: number
  errors: { row: number; email: string; error: string }[]
}
