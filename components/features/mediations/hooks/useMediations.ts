'use client'

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

export type MediationStatus = 'pending_review' | 'in_discussion' | 'agreement_reached' | 'resolved' | 'closed_no_changes'

export interface Mediation {
  id: string
  date: string
  status: MediationStatus
  initial_reason: string
  resolution_notes: string | null
  created_at: string
  resolved_at: string | null
  employee: {
    full_name: string
    email: string
  }
  is_stale: boolean
  last_activity_at: string
  differences: {
    clock_in_diff_minutes: number | null
    clock_out_diff_minutes: number | null
    hours_diff: number | null
  }
}

export interface MediationSummary {
  total: number
  pending_review: number
  in_discussion: number
  agreement_reached: number
  resolved: number
  closed_no_changes: number
  stale_count: number
}

interface UseMediationsOptions {
  status?: MediationStatus | 'all'
  startDate?: string
  endDate?: string
  employeeId?: string
  showStale?: boolean
}

export function useMediations(options: UseMediationsOptions = {}) {
  const [mediations, setMediations] = useState<Mediation[]>([])
  const [summary, setSummary] = useState<MediationSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMediations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.status) {
        params.append('status', options.status)
      }
      if (options.startDate) {
        params.append('start_date', options.startDate)
      }
      if (options.endDate) {
        params.append('end_date', options.endDate)
      }
      if (options.employeeId) {
        params.append('employee_id', options.employeeId)
      }
      if (options.showStale) {
        params.append('show_stale', 'true')
      }

      const res = await fetch(`/api/mediations?${params}`)
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cargar mediaciones')
      }

      const data = await res.json()
      setMediations(data.mediations)
      setSummary(data.summary)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [options.status, options.startDate, options.endDate, options.employeeId, options.showStale])

  useEffect(() => {
    fetchMediations()
  }, [fetchMediations])

  const createMediation = async (data: {
    date: string
    initial_reason: string
    admin_time_log_id?: string
    employee_time_log_id?: string
    employee_id?: string
  }) => {
    try {
      const res = await fetch('/api/mediations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al crear mediación')
      }

      const result = await res.json()
      toast.success('Mediación creada exitosamente')
      await fetchMediations()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(message)
      throw err
    }
  }

  const deleteMediation = async (id: string) => {
    try {
      const res = await fetch(`/api/mediations/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al eliminar mediación')
      }

      toast.success('Mediación eliminada exitosamente')
      await fetchMediations()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(message)
      throw err
    }
  }

  return {
    mediations,
    summary,
    isLoading,
    error,
    refetch: fetchMediations,
    createMediation,
    deleteMediation,
  }
}

export interface MediationDetail {
  id: string
  date: string
  status: MediationStatus
  initial_reason: string
  resolution_notes: string | null
  created_at: string
  resolved_at: string | null
  employee: {
    id: string
    name: string
    email: string
  }
  admin_record: {
    id: string
    clock_in: string | null
    clock_out: string | null
    total_hours: number | null
    marked_by: string
    edited_at: string | null
    is_editable: boolean
  } | null
  employee_record: {
    id: string
    clock_in: string | null
    clock_out: string | null
    total_hours: number | null
    marked_by: string
    edited_at: string | null
    is_editable: boolean
  } | null
  snapshots: {
    admin: {
      clock_in: string | null
      clock_out: string | null
      total_hours: number | null
    }
    employee: {
      clock_in: string | null
      clock_out: string | null
      total_hours: number | null
    }
  }
  proposed: {
    clock_in: string | null
    clock_out: string | null
    total_hours: number | null
    proposed_by: 'admin' | 'employee'
    proposed_at: string
  } | null
  counter: {
    clock_in: string | null
    clock_out: string | null
    total_hours: number | null
    proposed_by: 'admin' | 'employee'
    proposed_at: string
  } | null
  suggested: {
    clock_in: string | null
    clock_out: string | null
    total_hours: number | null
    suggested_by: string | null
    suggested_at: string | null
  } | null
  differences: {
    clock_in_diff_minutes: number | null
    clock_out_diff_minutes: number | null
    hours_diff: number | null
    has_difference: boolean
  }
  activity: {
    created_at: string
    admin_last_activity_at: string | null
    employee_last_activity_at: string | null
    is_stale: boolean
    stale_hours: number
  }
  notes: Array<{
    id: string
    author_id: string
    author_name: string
    author_role: 'admin' | 'employee'
    content: string
    type: 'comment' | 'system'
    created_at: string
  }>
  is_closed_by_admin: boolean
  is_closed_by_employee: boolean
  is_closed_by_me: boolean
  sees_change: boolean
  permissions: {
    can_edit_own_record: boolean
    can_edit_other_record: boolean
    can_propose: boolean
    can_accept_proposal: boolean
    can_reject_proposal: boolean
    can_counter_proposal: boolean
    can_close: boolean
    can_close_view: boolean
    can_reopen_view: boolean
    can_comment: boolean
    is_admin: boolean
    i_proposed: boolean
    has_proposal: boolean
    proposal_status: 'waiting_accept' | 'pending_my_accept' | null
    mediation_process_enabled: boolean
  }
}

export function useMediationDetail(id: string | null) {
  const [mediation, setMediation] = useState<MediationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMediation = useCallback(async () => {
    if (!id) {
      setMediation(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/mediations/${id}`)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cargar mediación')
      }

      const data = await res.json()
      setMediation(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchMediation()
  }, [fetchMediation])

  const updateMediation = async (action: string, data?: Record<string, unknown>) => {
    if (!id) return

    try {
      const res = await fetch(`/api/mediations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al actualizar mediación')
      }

      const result = await res.json()
      toast.success(result.message || 'Actualizado exitosamente')
      await fetchMediation()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(message)
      throw err
    }
  }

  return {
    mediation,
    isLoading,
    error,
    refetch: fetchMediation,
    updateMediation,
  }
}

export interface ComparisonEntry {
  date: string
  official: {
    id: string
    clock_in: string | null
    clock_out: string | null
    total_hours: number | null
    marked_by: string | null
    edited_at: string | null
  } | null
  personal: {
    id: string
    clock_in: string | null
    clock_out: string | null
    total_hours: number | null
    marked_by: string | null
    edited_at: string | null
  } | null
  hasDifference: boolean
  differences: {
    clock_in_diff_minutes: number | null
    clock_out_diff_minutes: number | null
    hours_diff: number | null
  } | null
  matchStatus: 'match' | 'partial_match' | 'missing_official' | 'missing_personal'
  mediation: {
    id: string
    status: string
    is_stale: boolean
    last_activity_at: string
  } | null
}

export interface ComparisonSummary {
  totalDays: number
  daysWithDifference: number
  daysMatching: number
  missingOfficial: number
  missingPersonal: number
  daysWithMediation: number
  differencePercentage: number
}

interface UseMediationComparisonOptions {
  startDate?: string
  endDate?: string
  employeeId?: string
  showOnlyDifferences?: boolean
}

export function useMediationComparison(options: UseMediationComparisonOptions = {}) {
  const [comparison, setComparison] = useState<ComparisonEntry[]>([])
  const [summary, setSummary] = useState<ComparisonSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComparison = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.startDate) {
        params.append('start_date', options.startDate)
      }
      if (options.endDate) {
        params.append('end_date', options.endDate)
      }
      if (options.employeeId) {
        params.append('employee_id', options.employeeId)
      }
      if (options.showOnlyDifferences === false) {
        params.append('show_only_differences', 'false')
      }

      console.log(`[useMediationComparison] Fetching comparison from ${options.startDate} to ${options.endDate}`)
      const res = await fetch(`/api/mediations/comparison?${params}`)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cargar comparación')
      }

      const data = await res.json()
      console.log(`[useMediationComparison] Received ${data.comparison?.length || 0} comparisons with ${data.summary?.daysWithDifference || 0} differences`)
      setComparison(data.comparison)
      setSummary(data.summary)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [options.startDate, options.endDate, options.employeeId, options.showOnlyDifferences])

  // Auto-fetch when dates are available
  useEffect(() => {
    if (options.startDate && options.endDate) {
      fetchComparison()
    }
  }, [fetchComparison, options.startDate, options.endDate])

  return {
    comparison,
    summary,
    isLoading,
    error,
    refetch: fetchComparison,
  }
}
