'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

export interface TodayLog {
  id: string
  clock_in: string | null
  clock_out: string | null
  total_hours: number | null
  is_manual: boolean
  record_type: string
}

export interface ManualUpdateData {
  clockIn?: string
  clockOut?: string
  notes?: string
  reason?: string
}

interface UseTodayLogReturn {
  todayLog: TodayLog | null
  isLoading: boolean
  actionLoading: 'clock_in' | 'clock_out' | 'update' | null
  isUpdating: boolean
  canEdit: boolean
  fetchTodayLog: () => Promise<void>
  handleClockIn: () => Promise<void>
  handleClockOut: () => Promise<void>
  updateManual: (data: ManualUpdateData) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useTodayLog(): UseTodayLogReturn {
  const [todayLog, setTodayLog] = useState<TodayLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<'clock_in' | 'clock_out' | 'update' | null>(null)

  const calculateTotalHours = (clockIn: string | null, clockOut: string | null): number | null => {
    if (!clockIn || !clockOut) return null
    const start = new Date(clockIn).getTime()
    const end = new Date(clockOut).getTime()
    const diffMs = end - start
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
  }

  const fetchTodayLog = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/time-logs/today')
      if (res.ok) {
        const data = await res.json()
        
        // Calcular total_hours manualmente si es null pero hay clock_in y clock_out
        if (data && data.total_hours === null && data.clock_in && data.clock_out) {
          data.total_hours = calculateTotalHours(data.clock_in, data.clock_out)
        }
        
        setTodayLog(data)
      } else {
        console.error('Error fetching today log:', res.status)
      }
    } catch (error) {
      console.error('Error fetching today log:', error)
      toast.error('Error al cargar los datos de hoy')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleClockIn = async () => {
    setActionLoading('clock_in')
    try {
      const res = await fetch('/api/time-logs/clock-in', { method: 'POST' })
      if (res.ok) {
        const now = new Date()
        toast.success('¡Entrada registrada!', {
          description: `Hora: ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        })
        await fetchTodayLog()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al registrar entrada')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al registrar entrada')
    } finally {
      setActionLoading(null)
    }
  }

  const handleClockOut = async () => {
    setActionLoading('clock_out')
    try {
      const res = await fetch('/api/time-logs/clock-out', { method: 'POST' })
      if (res.ok) {
        const now = new Date()
        toast.success('¡Salida registrada!', {
          description: `Hora: ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        })
        await fetchTodayLog()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al registrar salida')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al registrar salida')
    } finally {
      setActionLoading(null)
    }
  }

  /**
   * Actualiza el registro manualmente
   * Permite editar horas de entrada/salida manualmente
   */
  const updateManual = useCallback(async (data: ManualUpdateData): Promise<boolean> => {
    if (!todayLog?.id) {
      toast.error('No hay registro para actualizar')
      return false
    }

    setActionLoading('update')
    try {
      const res = await fetch('/api/time-logs/manual-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todayLog.id,
          ...data,
        }),
      })

      if (res.ok) {
        toast.success('Registro actualizado', {
          description: 'Los cambios han sido guardados correctamente',
        })
        await fetchTodayLog()
        return true
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || 'Error al actualizar el registro')
        return false
      }
    } catch (error) {
      console.error('Error updating time log:', error)
      toast.error('Error al actualizar el registro')
      return false
    } finally {
      setActionLoading(null)
    }
  }, [todayLog?.id, fetchTodayLog])

  const refresh = async () => {
    await fetchTodayLog()
  }

  // Determinar si se puede editar el registro
  // Por ahora permitimos editar si el registro existe
  const canEdit = Boolean(todayLog?.id)

  useEffect(() => {
    fetchTodayLog()
  }, [fetchTodayLog])

  return {
    todayLog,
    isLoading,
    actionLoading,
    isUpdating: actionLoading === 'update',
    canEdit,
    fetchTodayLog,
    handleClockIn,
    handleClockOut,
    updateManual,
    refresh,
  }
}

export default useTodayLog
