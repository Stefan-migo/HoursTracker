import type { TransformedRecord, FormatDetectionResult } from '@/lib/transformers/types'

export interface TransformStepProps {
  headers: string[]
  rows: Record<string, string>[]
  onTransformComplete: (records: TransformedRecord[]) => void
  onBack: () => void
}

export interface TransformSummary {
  total: number
  valid: number
  invalid: number
  skippedByInvalidHours: number
  uniqueEmployees: number
  uniqueDates: number
}
