'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { createLocalDateTime, getCurrentLocalDate } from '@/lib/utils/date-utils'

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
  actionLoading: 'clock_in' | 'clock_out' | 'update' | 'create' | 'delete' | null
  isUpdating: boolean
  canEdit: boolean
  fetchTodayLog: () => Promise<void>
  handleClockIn: () => Promise<void>
  handleClockOut: () => Promise<void>
  updateManual: (data: ManualUpdateData) => Promise<boolean>
  createPartialRecord: (data: { clockIn?: string; clockOut?: string }) => Promise<boolean>
  deleteTodayLog: () => Promise<boolean>
  refresh: () => Promise<void>
}

export function useTodayLog(): UseTodayLogReturn {
  const [todayLog, setTodayLog] = useState<TodayLog | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<'clock_in' | 'clock_out' | 'update' | 'create' | 'delete' | null>(null)
  const hasFetchedRef = useRef(false)

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
      const res = await fetch('/api/time-logs/today?source=personal')
      if (res.ok) {
        const data = await res.json()
        
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
      const now = new Date()
      const localDate = now.toLocaleDateString('sv-SE')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const localDateTime = `${localDate}T${hours}:${minutes}:${seconds}`
      const res = await fetch('/api/time-logs/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clock_in: localDateTime }),
      })
      if (res.ok) {
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
      const now = new Date()
      const localDate = now.toLocaleDateString('sv-SE')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const localDateTime = `${localDate}T${hours}:${minutes}:${seconds}`
      const res = await fetch('/api/time-logs/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clock_out: localDateTime }),
      })
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

  const createPartialRecord = useCallback(async (data: { clockIn?: string; clockOut?: string }): Promise<boolean> => {
    if (!data.clockIn) {
      toast.error('La hora de entrada es requerida')
      return false
    }

    setActionLoading('create')
    try {
      // data.clockIn can be either HH:MM (from input) or already converted
      if (!data.clockIn) {
        toast.error('La hora de entrada es requerida')
        return false
      }
      
      const today = getCurrentLocalDate()
      
      // Pass the time as-is, backend will handle conversion
      const body: Record<string, unknown> = {
        date: today,
        clock_in: data.clockIn,
        is_manual: true,
        is_official: false,
      }

      if (data.clockOut) {
        body.clock_out = data.clockOut
      }

      const res = await fetch('/api/time-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success('Registro creado', {
          description: data.clockOut 
            ? 'Entrada y salida registradas' 
            : 'Entrada registrada. Puedes agregar la salida más tarde.',
        })
        await fetchTodayLog()
        return true
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || 'Error al crear el registro')
        return false
      }
    } catch (error) {
      console.error('Error creating record:', error)
      toast.error('Error al crear el registro')
      return false
    } finally {
      setActionLoading(null)
    }
  }, [fetchTodayLog])

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

  const deleteTodayLog = useCallback(async (): Promise<boolean> => {
    if (!todayLog?.id) {
      toast.error('No hay registro para eliminar')
      return false
    }

    setActionLoading('delete')
    try {
      const res = await fetch(`/api/time-logs?id=${todayLog.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Registro eliminado')
        setTodayLog(null)
        return true
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || 'Error al eliminar el registro')
        return false
      }
    } catch (error) {
      console.error('Error deleting time log:', error)
      toast.error('Error al eliminar el registro')
      return false
    } finally {
      setActionLoading(null)
    }
  }, [todayLog?.id])

  const refresh = async () => {
    await fetchTodayLog()
  }

  const canEdit = true

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchTodayLog()
    }
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
    createPartialRecord,
    deleteTodayLog,
    refresh,
  }
}

export default useTodayLog
