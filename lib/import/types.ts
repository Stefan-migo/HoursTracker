export type ImportStep = 1 | 2 | 3 | 4 | 5 | 6

export interface ColumnMapping {
  sourceColumn: string
  targetField: string | null
  confidence: number
  sampleValues: string[]
}

export interface ParsedRow {
  [key: string]: string
}

export interface ValidationError {
  row: number
  field: string
  message: string
}

export interface PreviewRecord {
  row: number
  data: {
    email: string
    date: string
    clockIn: string
    clockOut: string
    [key: string]: string
  }
  errors: ValidationError[]
  isValid: boolean
}

export interface NewWorker {
  email: string
  fullName: string
  rowNumbers: number[]
  createProfile: boolean
  sendInvitation: boolean
}

export interface ImportResult {
  imported: number
  failed: number
  skipped: number
  workersCreated: number
  invitationsSent: number
  error?: string
  errors?: { row: number; email: string; error: string }[]
}

export interface WizardState {
  currentStep: ImportStep
  file: File | null
  fileData: {
    headers: string[]
    rows: ParsedRow[]
    totalRows: number
  } | null
  columnMapping: ColumnMapping[]
  previewRecords: PreviewRecord[]
  newWorkers: NewWorker[]
  importResult: ImportResult | null
  isLoading: boolean
  error: string | null
}

export const TARGET_FIELDS = [
  { id: 'email', label: 'Email', required: true },
  { id: 'date', label: 'Fecha', required: true },
  { id: 'clockIn', label: 'Hora Entrada', required: true },
  { id: 'clockOut', label: 'Hora Salida', required: true },
  { id: 'fullName', label: 'Nombre Completo', required: false },
  { id: 'notes', label: 'Notas', required: false },
] as const

export type TargetField = typeof TARGET_FIELDS[number]['id']
