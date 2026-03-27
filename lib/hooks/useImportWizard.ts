'use client'

import { useState, useCallback } from 'react'
import type { 
  ImportStep, 
  WizardState, 
  ColumnMapping, 
  PreviewRecord,
  NewWorker,
  ImportResult 
} from '@/lib/import/types'
import type { TransformedRecord } from '@/lib/transformers/types'

const initialState: WizardState = {
  currentStep: 1,
  file: null,
  fileData: null,
  columnMapping: [],
  previewRecords: [],
  newWorkers: [],
  importResult: null,
  isLoading: false,
  error: null
}

export interface UseImportWizardReturn {
  state: WizardState
  setStep: (step: ImportStep) => void
  nextStep: () => void
  prevStep: () => void
  setFile: (file: File | null) => void
  setFileData: (data: WizardState['fileData']) => void
  setColumnMapping: (mapping: ColumnMapping[]) => void
  updateColumnMapping: (sourceColumn: string, targetField: string | null) => void
  setPreviewRecords: (records: PreviewRecord[]) => void
  setNewWorkers: (workers: NewWorker[]) => void
  updateNewWorker: (email: string, updates: Partial<NewWorker>) => void
  setImportResult: (result: ImportResult | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
  canProceedToNext: () => boolean
  // New: transformed records
  transformedRecords: TransformedRecord[]
  setTransformedRecords: (records: TransformedRecord[]) => void
}

export function useImportWizard(): UseImportWizardReturn {
  const [state, setState] = useState<WizardState>(initialState)
  const [transformedRecords, setTransformedRecordsState] = useState<TransformedRecord[]>([])

  const setStep = useCallback((step: ImportStep) => {
    setState(prev => ({ ...prev, currentStep: step, error: null }))
  }, [])

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 6) as ImportStep,
      error: null
    }))
  }, [])

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1) as ImportStep,
      error: null
    }))
  }, [])

  const setFile = useCallback((file: File | null) => {
    setState(prev => ({ ...prev, file }))
  }, [])

  const setFileData = useCallback((data: WizardState['fileData']) => {
    console.log('[useImportWizard] setFileData called - headers:', data?.headers)
    console.log('[useImportWizard] setFileData called - first row raw:', JSON.stringify(data?.rows?.[0]))
    // Clone the data to avoid any reference issues
    const clonedData = data ? {
      ...data,
      rows: data.rows.map(row => ({...row}))
    } : null
    console.log('[useImportWizard] setFileData cloned first row:', clonedData?.rows?.[0])
    setState(prev => ({ ...prev, fileData: clonedData }))
  }, [])

  const setColumnMapping = useCallback((mapping: ColumnMapping[]) => {
    setState(prev => ({ ...prev, columnMapping: mapping }))
  }, [])

  const updateColumnMapping = useCallback((sourceColumn: string, targetField: string | null) => {
    setState(prev => ({
      ...prev,
      columnMapping: prev.columnMapping.map(m => 
        m.sourceColumn === sourceColumn 
          ? { ...m, targetField, confidence: targetField ? 1.0 : 0 }
          : m
      )
    }))
  }, [])

  const setPreviewRecords = useCallback((records: PreviewRecord[]) => {
    setState(prev => ({ ...prev, previewRecords: records }))
  }, [])

  const setNewWorkers = useCallback((workers: NewWorker[]) => {
    setState(prev => ({ ...prev, newWorkers: workers }))
  }, [])

  const updateNewWorker = useCallback((email: string, updates: Partial<NewWorker>) => {
    setState(prev => ({
      ...prev,
      newWorkers: prev.newWorkers.map(emp =>
        emp.email === email ? { ...emp, ...updates } : emp
      )
    }))
  }, [])

  const setImportResult = useCallback((result: ImportResult | null) => {
    setState(prev => ({ ...prev, importResult: result }))
  }, [])

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
    setTransformedRecordsState([])
  }, [])

  const setTransformedRecords = useCallback((records: TransformedRecord[]) => {
    setTransformedRecordsState(records)
    
    // Convert transformed records to preview records format
    const previewRecords: PreviewRecord[] = records.map((record, index) => ({
      row: index + 1,
      data: {
        email: record.email,
        date: record.date,
        clockIn: record.clockIn,
        clockOut: record.clockOut
      },
      errors: record.errors.map(err => ({ row: index + 1, field: 'general', message: err })),
      isValid: record.isValid
    }))
    
    setState(prev => ({ ...prev, previewRecords }))
    
    // Extract new employees - group by email OR by fullName if no email
    const recordsWithEmail = records.filter(r => r.email && r.email.trim())
    const recordsWithoutEmail = records.filter(r => !r.email || !r.email.trim())
    
    const newEmps: NewWorker[] = []
    
    // Group by email
    const emailGroups = new Map<string, TransformedRecord[]>()
    for (const record of recordsWithEmail) {
      const existing = emailGroups.get(record.email) || []
      existing.push(record)
      emailGroups.set(record.email, existing)
    }
    
    // Group by fullName for records without email
    const nameGroups = new Map<string, TransformedRecord[]>()
    for (const record of recordsWithoutEmail) {
      if (record.fullName && record.fullName.trim()) {
        const existing = nameGroups.get(record.fullName) || []
        existing.push(record)
        nameGroups.set(record.fullName, existing)
      }
    }
    
    // Create workers from email groups
    for (const [email, recs] of emailGroups) {
      const firstRecord = recs[0]
      newEmps.push({
        email,
        fullName: firstRecord.fullName || '',
        rowNumbers: recs.map((_, i) => i + 1),
        createProfile: true,
        sendInvitation: false
      })
    }
    
    // Create workers from name groups (for records without email)
    for (const [fullName, recs] of nameGroups) {
      const firstRecord = recs[0]
      newEmps.push({
        email: '', // No email for these workers
        fullName: fullName,
        rowNumbers: recs.map((_, i) => i + 1),
        createProfile: true,
        sendInvitation: false
      })
    }
    
    console.log('[ImportWizard] New workers extracted:', newEmps.length, newEmps)
    
    setState(prev => ({ ...prev, newWorkers: newEmps }))
  }, [])

  const canProceedToNext = useCallback(() => {
    switch (state.currentStep) {
      case 1:
        return state.file !== null && state.fileData !== null
      case 2:
        return true // TransformStep always allows proceeding
      case 3:
        return state.previewRecords.length > 0 && state.previewRecords.some(r => r.isValid)
      case 4:
        return true // Employee step always allows proceeding
      case 5:
        return state.previewRecords.some(r => r.isValid)
      case 6:
        return false // Last step
      default:
        return false
    }
  }, [state])

  return {
    state,
    setStep,
    nextStep,
    prevStep,
    setFile,
    setFileData,
    setColumnMapping,
    updateColumnMapping,
    setPreviewRecords,
    setNewWorkers,
    updateNewWorker,
    setImportResult,
    setLoading,
    setError,
    reset,
    canProceedToNext,
    transformedRecords,
    setTransformedRecords
  }
}
