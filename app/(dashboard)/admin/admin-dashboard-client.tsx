'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Settings, LogIn, LogOut, Clock3, Pencil, Trash2, RefreshCw, Search, Plus, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ClientOnly } from '@/components/client-only'

type WorkGroup = {
  id: string
  name: string
  clock_in_time: string
  clock_out_time: string
}

type Employee = {
  id: string
  full_name: string
  email: string
  is_active: boolean
  work_group_id: string | null
  work_groups: WorkGroup | null
  today_log: {
    id: string
    clock_in: string
    clock_out: string | null
    total_hours: number | null
  } | null
  is_present: boolean
  role?: 'employee' | 'admin'
  include_in_dashboard?: boolean
}

type FilterType = 'all' | 'active' | 'inactive'
type ModalType = 'mass' | 'config' | 'clock' | 'edit' | 'group' | null
type MassActionType = 'clock_in' | 'clock_out' | 'clock_full'

export default function AdminDashboardClient() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState({ active: 0, inactive: 0, total_hours: 0 })
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentDate] = useState(new Date().toISOString().split('T')[0])

  const [modal, setModal] = useState<ModalType>(null)
  const [modalEmployee, setModalEmployee] = useState<Employee | null>(null)
  const [massAction, setMassAction] = useState<MassActionType>('clock_in')
  const [showAddMenu, setShowAddMenu] = useState(false)

  const [massDate, setMassDate] = useState(new Date().toISOString().split('T')[0])
  const [massTime, setMassTime] = useState('09:00')
  const [massTimeOut, setMassTimeOut] = useState('18:00')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [groupName, setGroupName] = useState('')
  const [groupIn, setGroupIn] = useState('09:00')
  const [groupOut, setGroupOut] = useState('18:00')
  const [editingGroup, setEditingGroup] = useState<WorkGroup | null>(null)

  const [editDate, setEditDate] = useState('')
  const [editIn, setEditIn] = useState('')
  const [editOut, setEditOut] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [dashRes, groupsRes] = await Promise.all([
        fetch(`/api/admin/dashboard?date=${currentDate}`),
        fetch('/api/admin/work-groups'),
      ])

      if (dashRes.ok) {
        const dashData = await dashRes.json()
        console.log('[Dashboard] API Response:', JSON.stringify(dashData, null, 2))
        setEmployees(dashData.employees)
        setStats(dashData.stats)
      } else {
        const err = await dashRes.json()
        console.error('[Dashboard] API Error:', err)
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json()
        setWorkGroups(groupsData.data || [])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      toast.error('Error al cargar los datos')
    } finally {
      setIsLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('.add-menu-container')) {
        setShowAddMenu(false)
      }
    }
    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAddMenu])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [filter, filterGroup, search])

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.full_name.toLowerCase().includes(search.toLowerCase())
    const matchesGroup = filterGroup === 'all' || e.work_group_id === filterGroup
    if (filter === 'active') return matchesSearch && matchesGroup && e.is_present
    if (filter === 'inactive') return matchesSearch && matchesGroup && !e.is_present
    return matchesSearch && matchesGroup
  })

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredEmployees.map(e => e.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openClockModal = (employee: Employee, action: 'clock_in' | 'clock_out' | 'clock_full') => {
    setModalEmployee(employee)
    setMassAction(action)
    setMassTime(action === 'clock_in' ? '09:00' : action === 'clock_out' ? '18:00' : '09:00')
    setMassTimeOut('18:00')
    setError(null)
    setModal('clock')
  }

  const openEditModal = (employee: Employee) => {
    setModalEmployee(employee)
    if (employee.today_log) {
      const log = employee.today_log
      setEditDate(currentDate)
      setEditIn(new Date(log.clock_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }))
      setEditOut(log.clock_out ? new Date(log.clock_out).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '')
      setEditNotes('')
    } else {
      setEditDate(currentDate)
      setEditIn('')
      setEditOut('')
      setEditNotes('')
    }
    setError(null)
    setModal('edit')
  }

  const openBulkModal = (action: MassActionType) => {
    setMassAction(action)
    setMassDate(new Date().toISOString().split('T')[0])
    setMassTime(action === 'clock_in' ? '09:00' : action === 'clock_out' ? '18:00' : '09:00')
    setMassTimeOut('18:00')
    setSelectedIds(new Set(filteredEmployees.map(e => e.id)))
    setShowAddMenu(false)
    setError(null)
    setModal('mass')
  }

  const handleClockAction = async () => {
    if (!modalEmployee) return
    setIsSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        action: massAction,
        user_id: modalEmployee.id,
        date: currentDate,
      }

      if (massAction === 'clock_in') {
        body.clock_in = `${currentDate}T${massTime}:00`
      } else if (massAction === 'clock_out') {
        body.clock_out = `${currentDate}T${massTime}:00`
      } else {
        body.clock_in = `${currentDate}T${massTime}:00`
        body.clock_out = `${currentDate}T${massTimeOut}:00`
      }

      const res = await fetch('/api/time-logs/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success('Registro guardado correctamente')
        setModal(null)
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Error al registrar')
      }
    } catch {
      setError('Error al registrar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMassClock = async () => {
    if (selectedIds.size === 0) {
      toast.warning('Selecciona al menos un trabajador')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/logs/bulk-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: massAction,
          user_ids: Array.from(selectedIds),
          date: massDate,
          clock_in: massAction !== 'clock_out' ? `${massDate}T${massTime}:00` : undefined,
          clock_out: massAction !== 'clock_in' ? `${massDate}T${massTimeOut}:00` : undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`${data.success} registros guardados`)
        if (data.failed > 0) {
          toast.warning(`${data.failed} errores`)
        }
        setModal(null)
        setSelectedIds(new Set())
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Error al registrar')
      }
    } catch {
      setError('Error al registrar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const method = editingGroup ? 'PUT' : 'POST'
      const url = editingGroup ? `/api/admin/work-groups?id=${editingGroup.id}` : '/api/admin/work-groups'
      const body: Record<string, string> = {
        name: groupName,
        clock_in_time: groupIn,
        clock_out_time: groupOut,
      }
      if (editingGroup) body.id = editingGroup.id

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(editingGroup ? 'Grupo actualizado' : 'Grupo creado')
        setGroupName('')
        setGroupIn('09:00')
        setGroupOut('18:00')
        setEditingGroup(null)
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
      }
    } catch {
      setError('Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/work-groups?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Grupo eliminado')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleAssignGroup = async (employeeId: string, groupId: string | null) => {
    try {
      const res = await fetch('/api/admin/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: employeeId, work_group_id: groupId }),
      })
      if (res.ok) {
        toast.success('Grupo asignado')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al asignar')
      }
    } catch {
      toast.error('Error al asignar')
    }
  }

  const handleEditLog = async () => {
    if (!modalEmployee?.today_log) return
    setIsSubmitting(true)
    setError(null)
    try {
      const clockInLocal = editIn ? `${editDate}T${editIn}:00` : undefined
      const clockOutLocal = editOut ? `${editDate}T${editOut}:00` : undefined

      const res = await fetch(`/api/admin/logs?id=${modalEmployee.today_log.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editDate,
          clock_in: clockInLocal,
          clock_out: clockOutLocal,
          notes: editNotes || null,
        }),
      })

      if (res.ok) {
        toast.success('Registro actualizado')
        setModal(null)
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Error al actualizar')
      }
    } catch {
      setError('Error al actualizar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLog = async () => {
    if (!modalEmployee?.today_log) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/logs?id=${modalEmployee.today_log.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Registro eliminado')
        setModal(null)
        fetchData()
      } else {
        const data = await res.json()
        setError(data.error || 'Error al eliminar')
      }
    } catch {
      setError('Error al eliminar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <ClientOnly fallback={<div className="animate-pulse p-8"><div className="h-8 w-32 bg-muted rounded mb-4" /><div className="grid grid-cols-3 gap-4 mb-6">{[1,2,3].map(i => <div key={i} className="h-24 bg-muted rounded" />)}</div><div className="h-64 bg-muted rounded" /></div>}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-foreground-secondary mt-1">Control de asistencia</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setError(null); setModal('config'); }}>
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Config</span>
            </Button>
            <div className="relative add-menu-container">
              <Button size="sm" onClick={() => setShowAddMenu(!showAddMenu)}>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Registro</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              {showAddMenu && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-background border border-border rounded-lg shadow-lg z-50 py-1">
                  <button
                    onClick={() => openBulkModal('clock_in')}
                    className="w-full text-left px-4 py-2.5 hover:bg-background-secondary flex items-center gap-3 text-sm"
                  >
                    <LogIn className="h-4 w-4 text-success" />
                    <div>
                      <div className="font-medium">Entrada Masiva</div>
                      <div className="text-xs text-foreground-secondary">Registrar entrada para múltiples</div>
                    </div>
                  </button>
                  <button
                    onClick={() => openBulkModal('clock_out')}
                    className="w-full text-left px-4 py-2.5 hover:bg-background-secondary flex items-center gap-3 text-sm"
                  >
                    <LogOut className="h-4 w-4 text-error" />
                    <div>
                      <div className="font-medium">Salida Masiva</div>
                      <div className="text-xs text-foreground-secondary">Registrar salida para múltiples</div>
                    </div>
                  </button>
                  <button
                    onClick={() => openBulkModal('clock_full')}
                    className="w-full text-left px-4 py-2.5 hover:bg-background-secondary flex items-center gap-3 text-sm"
                  >
                    <Clock3 className="h-4 w-4 text-accent" />
                    <div>
                      <div className="font-medium">Registro Completo</div>
                      <div className="text-xs text-foreground-secondary">Entrada y salida masiva</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">Con registro</CardTitle>
              <div className="h-2 w-2 rounded-full bg-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-success">{stats.active}</div>
              <p className="text-xs text-foreground-secondary mt-1">Registraron hoy</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">Sin registro</CardTitle>
              <div className="h-2 w-2 rounded-full bg-error" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-error">{stats.inactive}</div>
              <p className="text-xs text-foreground-secondary mt-1">Sin registrar hoy</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md sm:col-span-1 col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">Total Horas</CardTitle>
              <Clock3 className="h-4 w-4 text-foreground-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">{stats.total_hours}h</div>
              <p className="text-xs text-foreground-secondary mt-1">Registradas hoy</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          {selectedIds.size > 0 && (
            <div className="p-3 sm:p-4 bg-accent-muted/50 border-b border-border-subtle">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-accent font-medium">
                  {selectedIds.size} sel.:
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-success border-success/30 hover:bg-success-muted h-8"
                  onClick={() => openBulkModal('clock_in')}
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Entrada</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-error border-error/30 hover:bg-error-muted h-8"
                  onClick={() => openBulkModal('clock_out')}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Salida</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-accent border-accent/30 hover:bg-accent-muted h-8"
                  onClick={() => openBulkModal('clock_full')}
                >
                  <Clock3 className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Completo</span>
                </Button>
              </div>
            </div>
          )}
          <CardHeader className="border-b border-border-subtle py-4">
            <div className="flex flex-col gap-4">
              <CardTitle className="text-base font-semibold">Trabajadores</CardTitle>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-secondary pointer-events-none" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-full"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={filterGroup}
                    onChange={(e) => setFilterGroup(e.target.value)}
                    className="h-10 px-3 rounded-md border border-border bg-background text-sm flex-1 min-w-[140px]"
                  >
                    <option value="all">Todos los grupos</option>
                    {workGroups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                  <div className="flex rounded-lg border border-border overflow-hidden w-full sm:w-auto">
                    {(['all', 'active', 'inactive'] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                          filter === f
                            ? 'bg-accent text-white'
                            : 'bg-background text-foreground-secondary hover:bg-background-secondary'
                        }`}
                      >
                        {f === 'active' ? 'Con reg.' : f === 'inactive' ? 'Sin reg.' : 'Todos'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-foreground-secondary">
                No hay trabajadores que coincidan
              </div>
            ) : (
              <>
                <div className="lg:overflow-x-auto">
                  <table className="hidden lg:table w-full">
                    <thead>
                      <tr className="border-b border-border-subtle bg-background-secondary/50">
                        <th className="text-left py-3 px-4 font-medium w-10">
                          <Checkbox
                            checked={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-foreground-secondary">Nombre</th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-foreground-secondary hidden lg:table-cell">Grupo</th>
                        <th className="text-center py-3 px-4 font-medium text-sm text-foreground-secondary">Status</th>
                        <th className="text-center py-3 px-4 font-medium text-sm text-foreground-secondary">Entrada</th>
                        <th className="text-center py-3 px-4 font-medium text-sm text-foreground-secondary">Salida</th>
                        <th className="text-center py-3 px-4 font-medium text-sm text-foreground-secondary">Total</th>
                        <th className="text-center py-3 px-4 font-medium text-sm text-foreground-secondary">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} className="border-b border-border-subtle hover:bg-background-secondary/50 transition-colors">
                          <td className="py-3 px-4">
                            <Checkbox
                              checked={selectedIds.has(employee.id)}
                              onCheckedChange={() => toggleSelect(employee.id)}
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">{employee.full_name}</div>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <select
                              value={employee.work_group_id || ''}
                              onChange={(e) => handleAssignGroup(employee.id, e.target.value || null)}
                              className="h-8 px-2 rounded-md border border-border bg-background text-sm"
                            >
                              <option value="">Sin grupo</option>
                              {workGroups.map(group => (
                                <option key={group.id} value={group.id}>{group.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={employee.is_present ? 'success' : 'secondary'}>
                              {employee.is_present ? 'Con registro' : 'Sin registro'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center text-foreground-secondary">
                            {formatTime(employee.today_log?.clock_in || null)}
                          </td>
                          <td className="py-3 px-4 text-center text-foreground-secondary">
                            {formatTime(employee.today_log?.clock_out || null)}
                          </td>
                          <td className="py-3 px-4 text-center text-foreground-secondary">
                            {employee.today_log?.total_hours ? `${employee.today_log.total_hours}h` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-success hover:bg-success-muted" onClick={() => openClockModal(employee, 'clock_in')}>
                                      <LogIn className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Clock In</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-error hover:bg-error-muted" onClick={() => openClockModal(employee, 'clock_out')}>
                                      <LogOut className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Clock Out</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" className="text-accent hover:bg-accent-muted" onClick={() => openEditModal(employee)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden divide-y divide-border-subtle">
                  {filteredEmployees.map((employee) => (
                    <div key={employee.id} className="p-4 hover:bg-background-secondary/30">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.has(employee.id)}
                          onCheckedChange={() => toggleSelect(employee.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="font-medium text-foreground truncate">{employee.full_name}</div>
                            <Badge variant={employee.is_present ? 'success' : 'secondary'} className="shrink-0">
                              {employee.is_present ? 'Con registro' : 'Sin registro'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                            <div>
                              <div className="text-xs text-foreground-secondary">Entrada</div>
                              <div className="text-foreground-secondary">{formatTime(employee.today_log?.clock_in || null)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-foreground-secondary">Salida</div>
                              <div className="text-foreground-secondary">{formatTime(employee.today_log?.clock_out || null)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-foreground-secondary">Total</div>
                              <div className="text-foreground-secondary">{employee.today_log?.total_hours ? `${employee.today_log.total_hours}h` : '-'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="text-success border-success/30 hover:bg-success-muted h-8" onClick={() => openClockModal(employee, 'clock_in')}>
                              <LogIn className="h-4 w-4" />
                              <span className="ml-1">Entrada</span>
                            </Button>
                            <Button size="sm" variant="outline" className="text-error border-error/30 hover:bg-error-muted h-8" onClick={() => openClockModal(employee, 'clock_out')}>
                              <LogOut className="h-4 w-4" />
                              <span className="ml-1">Salida</span>
                            </Button>
                            <Button size="sm" variant="outline" className="text-accent border-accent/30 hover:bg-accent-muted h-8" onClick={() => openEditModal(employee)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={modal === 'mass'} onOpenChange={() => setModal(null)}>
          <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className={massAction === 'clock_in' ? 'text-success' : massAction === 'clock_out' ? 'text-error' : 'text-accent'}>
                {massAction === 'clock_in' ? 'Registro Masivo de Entradas' : massAction === 'clock_out' ? 'Registro Masivo de Salidas' : 'Registro Masivo Completo'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-error-muted border border-error/20 rounded-lg text-error text-sm">
                  {error}
                </div>
              )}

              <div className={massAction === 'clock_full' ? 'space-y-4' : 'space-y-4'}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" value={massDate} onChange={(e) => setMassDate(e.target.value)} />
                  </div>
                  {massAction === 'clock_full' ? (
                    <div className="grid grid-cols-2 gap-2 col-span-2">
                      <div className="space-y-2">
                        <Label className="text-success text-xs">Entrada</Label>
                        <Input type="time" value={massTime} onChange={(e) => setMassTime(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-error text-xs">Salida</Label>
                        <Input type="time" value={massTimeOut} onChange={(e) => setMassTimeOut(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className={massAction === 'clock_in' ? 'text-success' : 'text-error'}>
                        {massAction === 'clock_in' ? 'Hora Entrada' : 'Hora Salida'}
                      </Label>
                      <Input type="time" value={massTime} onChange={(e) => setMassTime(e.target.value)} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Seleccionar Trabajadores</Label>
                  <Badge variant="secondary" className="bg-accent-muted text-accent">
                    {selectedIds.size} sel.
                  </Badge>
                </div>
                <div className="border border-border rounded-lg max-h-48 sm:max-h-64 overflow-y-auto">
                  {employees.length === 0 ? (
                    <div className="p-4 text-center text-foreground-secondary text-sm">No hay trabajadores</div>
                  ) : (
                    <div className="p-2">
                      <div className="flex items-center gap-2 p-2 border-b border-border-subtle">
                        <Checkbox
                          checked={selectedIds.size === employees.length}
                          onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-sm font-medium">Todos</span>
                      </div>
                      {employees.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2 p-2 hover:bg-background-secondary rounded">
                          <Checkbox
                            checked={selectedIds.has(emp.id)}
                            onCheckedChange={() => toggleSelect(emp.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{emp.full_name}</div>
                            <div className="text-xs text-foreground-secondary truncate">{emp.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button variant="outline" onClick={() => setModal(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleMassClock}
                  disabled={isSubmitting || selectedIds.size === 0}
                  className="flex-1"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={modal === 'clock'} onOpenChange={() => setModal(null)}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle className={massAction === 'clock_in' ? 'text-success' : massAction === 'clock_out' ? 'text-error' : 'text-accent'}>
                {massAction === 'clock_in' ? 'Registrar Entrada' : massAction === 'clock_out' ? 'Registrar Salida' : 'Registro Completo'}
              </DialogTitle>
              <DialogDescription>{modalEmployee?.full_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-error-muted border border-error/20 rounded-lg text-error text-sm">
                  {error}
                </div>
              )}
              {massAction === 'clock_full' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" value={massDate} onChange={(e) => setMassDate(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-success text-xs">Hora Entrada</Label>
                      <Input type="time" value={massTime} onChange={(e) => setMassTime(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-error text-xs">Hora Salida</Label>
                      <Input type="time" value={massTimeOut} onChange={(e) => setMassTimeOut(e.target.value)} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" value={massDate} onChange={(e) => setMassDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className={massAction === 'clock_in' ? 'text-success' : 'text-error'}>
                      {massAction === 'clock_in' ? 'Hora Entrada' : 'Hora Salida'}
                    </Label>
                    <Input type="time" value={massTime} onChange={(e) => setMassTime(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleClockAction} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={modal === 'edit'} onOpenChange={() => setModal(null)}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Registro</DialogTitle>
              <DialogDescription>{modalEmployee?.full_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-error-muted border border-error/20 rounded-lg text-error text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-success text-xs">Entrada</Label>
                  <Input type="time" value={editIn} onChange={(e) => setEditIn(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-error text-xs">Salida</Label>
                  <Input type="time" value={editOut} onChange={(e) => setEditOut(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Opcional..." />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              {modalEmployee?.today_log && (
                <Button variant="destructive" onClick={handleDeleteLog} disabled={isSubmitting} className="w-full sm:w-auto mr-auto">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancelar</Button>
              <Button onClick={handleEditLog} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={modal === 'config'} onOpenChange={() => setModal(null)}>
          <DialogContent className="w-[95vw] max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configuración</DialogTitle>
              <DialogDescription>Grupos de trabajo y horarios</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-error-muted border border-error/20 rounded-lg text-error text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Agregar/Editar Grupo</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input placeholder="Nombre" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                  <Input type="time" value={groupIn} onChange={(e) => setGroupIn(e.target.value)} />
                  <Input type="time" value={groupOut} onChange={(e) => setGroupOut(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={handleSaveGroup} disabled={isSubmitting}>
                    {editingGroup ? 'Actualizar' : 'Agregar'}
                  </Button>
                  {editingGroup && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingGroup(null); setGroupName(''); setGroupIn('09:00'); setGroupOut('18:00'); }}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-medium">Grupos Existentes</h3>
                {workGroups.length === 0 ? (
                  <p className="text-sm text-foreground-secondary">No hay grupos creados</p>
                ) : (
                  <div className="space-y-2">
                    {workGroups.map(group => (
                      <div key={group.id} className="flex items-center justify-between p-2 rounded-lg bg-background-secondary flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group.name}</span>
                          <span className="text-sm text-foreground-secondary">
                            {group.clock_in_time?.slice(0,5)} - {group.clock_out_time?.slice(0,5)}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => { setEditingGroup(group); setGroupName(group.name); setGroupIn(group.clock_in_time?.slice(0,5) || '09:00'); setGroupOut(group.clock_out_time?.slice(0,5) || '18:00'); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteGroup(group.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-medium">Asignar Trabajadores a Grupos</h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {employees.filter(e => !e.work_group_id).length === 0 ? (
                    <p className="text-sm text-foreground-secondary">Todos los trabajadores tienen grupo asignado</p>
                  ) : (
                    employees.filter(e => !e.work_group_id).map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-2 rounded-lg bg-background-secondary flex-wrap gap-2">
                        <span className="text-sm">{emp.full_name}</span>
                        <select
                          value=""
                          onChange={(e) => handleAssignGroup(emp.id, e.target.value || null)}
                          className="h-8 px-2 rounded-md border border-border bg-background text-sm"
                        >
                          <option value="">Asignar a grupo...</option>
                          {workGroups.map(group => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModal(null)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  )
}
