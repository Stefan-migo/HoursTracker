'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Clock, Calendar, Edit, Trash2, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatTime, formatDate, calculateTotalHours } from '@/lib/utils'
import type { TimeLog } from '@/lib/supabase/types'
import { toast } from 'sonner'

type DateFilter = 'today' | 'week' | 'month' | 'all'
type RecordMode = 'full' | 'entrance' | 'exit'

export default function WorkerMyLogsPage() {
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('week')
  const [page, setPage] = useState(0)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [pageSize] = useState(15)
  const [recordMode, setRecordMode] = useState<RecordMode>('full')

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    clock_in: '09:00',
    clock_out: '18:00',
  })

  useEffect(() => {
    fetchLogs()
  }, [dateFilter])

  async function fetchLogs() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', '100')
      params.append('source', 'personal')
      
      const res = await fetch(`/api/time-logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        let logsData = data.data || []
        
        // Fallback: Calculate total_hours client-side if null but clock times exist
        logsData = logsData.map((log: TimeLog) => {
          if ((log.total_hours === null || log.total_hours === undefined) && log.clock_in && log.clock_out) {
            return {
              ...log,
              total_hours: calculateTotalHours(log.clock_in, log.clock_out)
            }
          }
          return log
        })
        
        setLogs(logsData)
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('Error fetching logs:', errorData.error || res.statusText)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter logs by date
  const filteredLogs = logs.filter(log => {
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = log.date.split('-').map(Number)
    const logDate = new Date(year, month - 1, day)
    
    const today = new Date()
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth()
    const todayDay = today.getDate()
    const todayLocal = new Date(todayYear, todayMonth, todayDay)

    if (dateFilter === 'today') {
      return logDate.getTime() === todayLocal.getTime()
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(todayLocal)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return logDate >= weekAgo
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(todayLocal)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return logDate >= monthAgo
    }
    return true
  })

  // Sort by date descending
  const sortedLogs = [...filteredLogs].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // Pagination
  const totalPages = Math.ceil(sortedLogs.length / pageSize)
  const paginatedLogs = sortedLogs.slice(page * pageSize, (page + 1) * pageSize)

  // Stats
  const totalHours = filteredLogs.reduce((sum, l) => sum + (l.total_hours || 0), 0)
  const daysWorked = new Set(filteredLogs.map(l => l.date)).size

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setActionLoading('submitting')

    try {
      const clockInFull = `${formData.date}T${formData.clock_in}:00`
      const clockOutFull = `${formData.date}T${formData.clock_out}:00`

      if (editingLog) {
        const updateData: { clock_in?: string; clock_out?: string; is_manual: boolean } = {
          is_manual: true,
        }
        if (recordMode === 'full' || recordMode === 'entrance') {
          updateData.clock_in = clockInFull
        }
        if (recordMode === 'full' || recordMode === 'exit') {
          updateData.clock_out = clockOutFull
        }

        const res = await fetch(`/api/time-logs?id=${editingLog.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })

        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error || 'Error al actualizar')
          return
        }
        toast.success('Registro actualizado correctamente')
      } else {
        const createData: { date: string; clock_in?: string; clock_out?: string; is_manual: boolean; is_official: boolean } = {
          date: formData.date,
          is_manual: true,
          is_official: false,
        }
        if (recordMode === 'full' || recordMode === 'entrance') {
          createData.clock_in = clockInFull
        }
        if (recordMode === 'full' || recordMode === 'exit') {
          createData.clock_out = clockOutFull
        }

        const res = await fetch('/api/time-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createData),
        })

        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error || 'Error al crear')
          return
        }
        toast.success('Registro creado correctamente')
      }

      setShowModal(false)
      setEditingLog(null)
      setRecordMode('full')
      setFormData({
        date: new Date().toISOString().split('T')[0],
        clock_in: '09:00',
        clock_out: '18:00',
      })
      await fetchLogs()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(log: TimeLog) {
    if (!confirm(`¿Eliminar registro del ${formatDate(log.date)}?`)) return

    setActionLoading(log.id)
    try {
      const res = await fetch(`/api/time-logs?id=${log.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Registro eliminado correctamente')
        await fetchLogs()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al eliminar el registro')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error de conexión al eliminar el registro')
    } finally {
      setActionLoading(null)
    }
  }

  function openEditModal(log: TimeLog) {
    setEditingLog(log)
    const date = log.clock_in?.split('T')[0] || log.date
    // Convert UTC timestamps to local time for the form
    const inTime = log.clock_in 
      ? new Date(log.clock_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '09:00'
    const outTime = log.clock_out
      ? new Date(log.clock_out).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '18:00'

    setFormData({
      date: date,
      clock_in: inTime,
      clock_out: outTime,
    })
    setShowModal(true)
  }

  function openNewModal() {
    setEditingLog(null)
    setRecordMode('full')
    setFormData({
      date: new Date().toISOString().split('T')[0],
      clock_in: '09:00',
      clock_out: '18:00',
    })
    setShowModal(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Registros</h1>
          <p className="text-foreground-secondary">Gestiona tus registros de tiempo</p>
        </div>
        <Button onClick={openNewModal}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Registro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground-secondary">Total Horas</CardTitle>
            <Clock className="h-4 w-4 text-foreground-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-foreground-secondary">Período seleccionado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground-secondary">Días Trabajados</CardTitle>
            <Calendar className="h-4 w-4 text-foreground-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{daysWorked}</div>
            <p className="text-xs text-foreground-secondary">Días con registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground-secondary">Registros</CardTitle>
            <Edit className="h-4 w-4 text-foreground-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{filteredLogs.length}</div>
            <p className="text-xs text-foreground-secondary">Total de registros</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Date Filters */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-foreground-secondary self-center mr-2">Período:</span>
              <button
                onClick={() => { setDateFilter('today'); setPage(0); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateFilter === 'today' 
                    ? 'bg-accent text-white' 
                    : 'bg-background-secondary text-foreground hover:bg-background-tertiary'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => { setDateFilter('week'); setPage(0); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateFilter === 'week' 
                    ? 'bg-accent text-white' 
                    : 'bg-background-secondary text-foreground hover:bg-background-tertiary'
                }`}
              >
                Esta Semana
              </button>
              <button
                onClick={() => { setDateFilter('month'); setPage(0); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateFilter === 'month' 
                    ? 'bg-accent text-white' 
                    : 'bg-background-secondary text-foreground hover:bg-background-tertiary'
                }`}
              >
                Este Mes
              </button>
              <button
                onClick={() => { setDateFilter('all'); setPage(0); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateFilter === 'all' 
                    ? 'bg-accent text-white' 
                    : 'bg-background-secondary text-foreground hover:bg-background-tertiary'
                }`}
              >
                Todo
              </button>
            </div>
            

          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
            </div>
          ) : paginatedLogs.length === 0 ? (
            <div className="p-8 text-center text-foreground-secondary">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay registros en este período</p>
              <Button onClick={openNewModal} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear primer registro
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-background-secondary">
                      <th className="text-left py-3 px-4 font-medium">Fecha</th>
                      <th className="text-left py-3 px-4 font-medium">Entrada</th>
                      <th className="text-left py-3 px-4 font-medium">Salida</th>
                      <th className="text-right py-3 px-4 font-medium">Total</th>
                      <th className="text-right py-3 px-4 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-background-secondary/50 transition-colors">
                        <td className="py-3 px-4 font-medium">{formatDate(log.date)}</td>
                        <td className="py-3 px-4 text-success">{formatTime(log.clock_in)}</td>
                        <td className="py-3 px-4 text-error">{formatTime(log.clock_out)}</td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {log.total_hours !== null && log.total_hours !== undefined
                            ? `${log.total_hours.toFixed(1)}h`
                            : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!log.is_official && (
                            <TooltipProvider>
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEditModal(log)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Editar registro</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDelete(log)}
                                      disabled={actionLoading === log.id}
                                    >
                                      <Trash2 className="h-4 w-4 text-error" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Eliminar registro</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <span className="text-sm text-foreground-secondary">
                    Página {page + 1} de {totalPages} ({filteredLogs.length} registros)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) {
          setShowModal(false)
          setEditingLog(null)
          setRecordMode('full')
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLog ? 'Editar Registro' : 'Nuevo Registro'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full h-10 px-3 border border-border rounded-md bg-background"
                required
              />
            </div>

            {!editingLog && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de registro</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={recordMode === 'full' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRecordMode('full')}
                    className="text-xs h-9"
                  >
                    Entrada y Salida
                  </Button>
                  <Button
                    type="button"
                    variant={recordMode === 'entrance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRecordMode('entrance')}
                    className="text-xs h-9"
                  >
                    Solo Entrada
                  </Button>
                  <Button
                    type="button"
                    variant={recordMode === 'exit' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRecordMode('exit')}
                    className="text-xs h-9"
                  >
                    Solo Salida
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  <span className="text-success">Entrada</span>
                </label>
                <input
                  type="time"
                  value={formData.clock_in}
                  onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
                  className="w-full h-10 px-3 border border-border rounded-md bg-background"
                  required={recordMode === 'full' || recordMode === 'entrance'}
                  disabled={recordMode === 'exit'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  <span className="text-error">Salida</span>
                </label>
                <input
                  type="time"
                  value={formData.clock_out}
                  onChange={(e) => setFormData({ ...formData, clock_out: e.target.value })}
                  className="w-full h-10 px-3 border border-border rounded-md bg-background"
                  required={recordMode === 'full' || recordMode === 'exit'}
                  disabled={recordMode === 'entrance'}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={actionLoading === 'submitting'} className="flex-1">
                {actionLoading === 'submitting' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingLog ? (
                  'Actualizar'
                ) : (
                  'Crear'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
