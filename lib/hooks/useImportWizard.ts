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
    setState(prev => ({ ...prev, fileData: data }))
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
    
    // Extract new employees
    const emails = [...new Set(records.map(r => r.email).filter(Boolean))]
    const newEmps = emails.map(email => ({
      email,
      fullName: records.find(r => r.email === email)?.fullName || '',
      rowNumbers: records.filter(r => r.email === email).map((_, i) => i + 1),
      createProfile: true,
      sendInvitation: false
    }))
    
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
