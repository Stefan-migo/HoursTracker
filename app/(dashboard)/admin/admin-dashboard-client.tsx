'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Clock, Users, TrendingUp, Calendar, LogIn, LogOut, Search, RefreshCw, UserCheck, UserX, X } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton'
import { useMemo } from 'react'
import { ClientOnly } from '@/components/client-only'

type Employee = {
  id: string
  full_name: string
  email: string
  is_active: boolean
}

type FilterType = 'all' | 'active' | 'inactive'

type ModalState = {
  open: boolean
  employee: Employee | null
  action: 'clock_in' | 'clock_out' | null
}

export default function AdminDashboardClient() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({
    totalHours: 0,
    totalEmployees: 0,
    activeEmployees: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('active')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [bulkActionRunning, setBulkActionRunning] = useState(false)
  const [modal, setModal] = useState<ModalState>({ open: false, employee: null, action: null })
  const [manualMode, setManualMode] = useState(false)
  const [manualDate, setManualDate] = useState('')
  const [manualTime, setManualTime] = useState('09:00')
  const [bulkAction, setBulkAction] = useState<'clock_in' | 'clock_out' | null>(null)

  // Set manual date on client only to avoid hydration mismatch
  useEffect(() => {
    setManualDate(new Date().toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [employeesRes, statsRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch('/api/admin/logs?limit=1000'),
      ])

      if (employeesRes.ok) {
        const employeesData = await employeesRes.json()
        setEmployees(employeesData)
        
        setStats(prev => ({
          ...prev,
          totalEmployees: employeesData?.length || 0,
          activeEmployees: employeesData?.filter((e: Employee) => e.is_active).length || 0,
        }))
      }

      if (statsRes.ok) {
        const logsData = await statsRes.json()
        
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekStartStr = weekStart.toISOString().split('T')[0]
        
        const weekLogs = logsData.data?.filter((log: any) => log.date >= weekStartStr && log.total_hours) || []
        const totalHours = weekLogs.reduce((sum: number, log: any) => sum + (log.total_hours || 0), 0)
        
        setStats(prev => ({
          ...prev,
          totalHours,
        }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmitAction() {
    if (!modal.employee || !modal.action) return

    setActionLoading(modal.employee.id)
    try {
      const body: Record<string, unknown> = {
        action: modal.action,
        user_id: modal.employee.id,
        is_manual: manualMode,
      }

      if (manualMode) {
        body.date = manualDate
        body.clock_in = modal.action === 'clock_in' ? `${manualDate}T${manualTime}:00` : undefined
        body.clock_out = modal.action === 'clock_out' ? `${manualDate}T${manualTime}:00` : undefined
      }

      const res = await fetch('/api/time-logs/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(`${modal.action === 'clock_in' ? 'Entrada' : 'Salida'} registrada correctamente`)
        await fetchData()
        closeModal()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al registrar')
      }
    } catch (error) {
      toast.error('Error al registrar')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleBulkAction(action: 'clock_in' | 'clock_out' | 'activate' | 'deactivate') {
    if (selectedIds.size === 0) {
      toast.warning('Selecciona al menos un empleado')
      return
    }

    if (action === 'clock_in' || action === 'clock_out') {
      setBulkAction(action)
      setManualMode(false)
      setManualDate(new Date().toISOString().split('T')[0])
      setManualTime(action === 'clock_in' ? '09:00' : '18:00')
      return
    }

    setBulkActionRunning(true)
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map(id =>
          fetch('/api/admin/employees', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, is_active: action === 'activate' }),
          })
        )
      )

      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) {
        toast.error(`Error en ${failed} operaciones`)
      } else {
        toast.success(`${selectedIds.size} empleado(s) ${action === 'activate' ? 'activado(s)' : 'desactivado(s)'}`)
      }

      setSelectedIds(new Set())
      await fetchData()
    } catch (error) {
      toast.error('Error al realizar acción')
    } finally {
      setBulkActionRunning(false)
    }
  }

  async function executeBulkClockAction() {
    if (!bulkAction) return

    setBulkActionRunning(true)
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map(id => {
          const body: Record<string, unknown> = {
            action: bulkAction,
            user_id: id,
            is_manual: manualMode,
          }

          if (manualMode) {
            body.date = manualDate
            body.clock_in = bulkAction === 'clock_in' ? `${manualDate}T${manualTime}:00` : undefined
            body.clock_out = bulkAction === 'clock_out' ? `${manualDate}T${manualTime}:00` : undefined
          }

          return fetch('/api/time-logs/clock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        })
      )

      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) {
        toast.error(`Error en ${failed} operaciones`)
      } else {
        toast.success(`${selectedIds.size} ${bulkAction === 'clock_in' ? 'entradas' : 'salidas'} registradas`)
      }

      setSelectedIds(new Set())
      setBulkAction(null)
      await fetchData()
    } catch (error) {
      toast.error('Error al registrar')
    } finally {
      setBulkActionRunning(false)
    }
  }

  const filteredEmployees = useMemo(() => {
    const searchLower = search.toLowerCase()
    return employees.filter(e => {
      const matchesSearch = 
        e.full_name.toLowerCase().includes(searchLower) ||
        e.email.toLowerCase().includes(searchLower)
      
      if (filter === 'active') return matchesSearch && e.is_active
      if (filter === 'inactive') return matchesSearch && !e.is_active
      return matchesSearch
    })
  }, [employees, search, filter])

  function toggleSelectAll() {
    setSelectedIds(prev => {
      if (prev.size === filteredEmployees.length) {
        return new Set()
      } else {
        return new Set(filteredEmployees.map(e => e.id))
      }
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      return newSelected
    })
  }

  function openModal(employee: Employee, action: 'clock_in' | 'clock_out') {
    setModal({ open: true, employee, action })
    setManualMode(false)
    setManualDate(new Date().toISOString().split('T')[0])
    setManualTime(action === 'clock_in' ? '09:00' : '18:00')
  }

  function closeModal() {
    setModal({ open: false, employee: null, action: null })
  }

  // Client-side time display component to avoid hydration mismatch
  function CurrentTimeDisplay() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    
    if (!mounted) {
      return <span>--:--</span>
    }
    
    return <span>{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
  }

  return (
    <ClientOnly fallback={
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-foreground-secondary mt-1">Resumen y gestión de empleados</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <Card>
          <CardHeader className="border-b border-border-subtle">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle className="text-base font-semibold">Gestión de Empleados</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6">
              <SkeletonTable rows={5} />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-foreground-secondary mt-1">Resumen y gestión de empleados</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <Card className="transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground-secondary">Total Horas</CardTitle>
                  <Clock className="h-4 w-4 text-foreground-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-foreground">{stats.totalHours.toFixed(1)}h</div>
                  <p className="text-xs text-foreground-secondary mt-1">Esta semana</p>
                </CardContent>
              </Card>

              <Card className="transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground-secondary">Total Empleados</CardTitle>
                  <Users className="h-4 w-4 text-foreground-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-foreground">{stats.totalEmployees}</div>
                  <p className="text-xs text-foreground-secondary mt-1">Registrados</p>
                </CardContent>
              </Card>

              <Card className="transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground-secondary">Empleados Activos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-success">{stats.activeEmployees}</div>
                  <p className="text-xs text-foreground-secondary mt-1">Activos</p>
                </CardContent>
              </Card>

              <Card className="transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-foreground-secondary">Seleccionados</CardTitle>
                  <Calendar className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-accent">{selectedIds.size}</div>
                  <p className="text-xs text-foreground-secondary mt-1">Para acción masiva</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader className="border-b border-border-subtle">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle className="text-base font-semibold">Gestión de Empleados</CardTitle>
              <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-secondary pointer-events-none" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-full sm:w-48"
                  />
                </div>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(['active', 'all', 'inactive'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        filter === f
                          ? 'bg-accent text-white'
                          : 'bg-background text-foreground-secondary hover:bg-background-secondary'
                      }`}
                    >
                      {f === 'active' ? 'Activos' : f === 'inactive' ? 'Inactivos' : 'Todos'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>

          {selectedIds.size > 0 && (
            <div className="p-4 bg-accent-muted/50 border-b border-border-subtle">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-accent font-medium">
                  {selectedIds.size} seleccionado(s):
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-success border-success/30 hover:bg-success-muted"
                  onClick={() => handleBulkAction('clock_in')}
                  disabled={bulkActionRunning}
                >
                  {bulkActionRunning ? <Spinner size="sm" className="text-success" /> : <LogIn className="h-4 w-4" />}
                  <span className="hidden sm:inline">Entrada</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-error border-error/30 hover:bg-error-muted"
                  onClick={() => handleBulkAction('clock_out')}
                  disabled={bulkActionRunning}
                >
                  {bulkActionRunning ? <Spinner size="sm" className="text-error" /> : <LogOut className="h-4 w-4" />}
                  <span className="hidden sm:inline">Salida</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-success border-success/30 hover:bg-success-muted"
                  onClick={() => handleBulkAction('activate')}
                  disabled={bulkActionRunning}
                >
                  {bulkActionRunning ? <Spinner size="sm" className="text-success" /> : <UserCheck className="h-4 w-4" />}
                  <span className="hidden sm:inline">Activar</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-foreground-secondary border-border hover:bg-background-secondary"
                  onClick={() => handleBulkAction('deactivate')}
                  disabled={bulkActionRunning}
                >
                  {bulkActionRunning ? <Spinner size="sm" className="text-foreground-secondary" /> : <UserX className="h-4 w-4" />}
                  <span className="hidden sm:inline">Desactivar</span>
                </Button>
              </div>
            </div>
          )}

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <SkeletonTable rows={5} />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-foreground-secondary">
                No hay empleados que coincidan con los filtros
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-subtle bg-background-secondary/50">
                      <th className="text-left py-3 px-4 font-medium w-10">
                        <Checkbox
                          checked={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-foreground-secondary">Empleado</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-foreground-secondary hidden sm:table-cell">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-foreground-secondary">Estado</th>
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
                        <td className="py-3 px-4 text-foreground-secondary hidden sm:table-cell text-sm">{employee.email}</td>
                        <td className="py-3 px-4">
                          <Badge variant={employee.is_active ? 'success' : 'secondary'}>
                            {employee.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {employee.is_active && (
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-success hover:bg-success-muted"
                                onClick={() => openModal(employee, 'clock_in')}
                                disabled={actionLoading === employee.id}
                              >
                                {actionLoading === employee.id ? <Spinner size="sm" className="text-success" /> : <LogIn className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-error hover:bg-error-muted"
                                onClick={() => openModal(employee, 'clock_out')}
                                disabled={actionLoading === employee.id}
                              >
                                {actionLoading === employee.id ? <Spinner size="sm" className="text-error" /> : <LogOut className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="/admin/employees"
            className="group p-4 border border-border rounded-lg hover:bg-background-secondary transition-colors"
          >
            <Users className="h-6 w-6 mb-2 text-accent" />
            <p className="font-medium text-foreground group-hover:text-accent transition-colors">Gestionar Empleados</p>
            <p className="text-sm text-foreground-secondary">Agregar, editar, activar/desactivar</p>
          </a>
          <a
            href="/admin/import"
            className="group p-4 border border-border rounded-lg hover:bg-background-secondary transition-colors"
          >
            <Calendar className="h-6 w-6 mb-2 text-accent" />
            <p className="font-medium text-foreground group-hover:text-accent transition-colors">Importar Excel</p>
            <p className="text-sm text-foreground-secondary">Cargar datos desde archivo</p>
          </a>
        </div>

        {/* Modal for Clock In/Out */}
        {modal.open && modal.employee && modal.action && (
          <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md animate-scale-in">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    Registrar {modal.action === 'clock_in' ? 'Entrada' : 'Salida'}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={closeModal}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-foreground-secondary">
                  Empleado: <strong className="text-foreground">{modal.employee.full_name}</strong>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualMode}
                    onChange={(e) => setManualMode(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-foreground">Registrar hora manual</span>
                </label>

                {manualMode && (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-background-secondary rounded-lg">
                    <div>
                      <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Fecha</label>
                      <Input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Hora</label>
                      <Input
                        type="time"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {!manualMode && (
                  <div className="p-4 bg-success-muted border border-success/20 rounded-lg text-center">
                    <p className="text-sm text-success font-medium">
                      Se registrará la hora actual: <strong><CurrentTimeDisplay /></strong>
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={closeModal} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmitAction} 
                    disabled={actionLoading === modal.employee.id}
                    variant={modal.action === 'clock_in' ? 'success' : 'destructive'}
                    className="flex-1"
                  >
                    {actionLoading === modal.employee.id ? (
                      <Spinner size="sm" className="text-white" />
                    ) : (
                      modal.action === 'clock_in' ? 'Registrar Entrada' : 'Registrar Salida'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Clock In/Out Modal */}
        {bulkAction && (
          <div className="fixed inset-0 bg-foreground/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md animate-scale-in">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    Registrar {bulkAction === 'clock_in' ? 'Entrada' : 'Salida'} Masiva
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setBulkAction(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-foreground-secondary">
                  <strong className="text-foreground">{selectedIds.size}</strong> empleado(s) seleccionado(s)
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={manualMode}
                    onChange={(e) => setManualMode(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm font-medium text-foreground">Registrar hora manual</span>
                </label>

                {manualMode && (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-background-secondary rounded-lg">
                    <div>
                      <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Fecha</label>
                      <Input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Hora</label>
                      <Input
                        type="time"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {!manualMode && (
                  <div className="p-4 bg-success-muted border border-success/20 rounded-lg text-center">
                    <p className="text-sm text-success font-medium">
                      Se registrará la hora actual: <strong><CurrentTimeDisplay /></strong>
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setBulkAction(null)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={executeBulkClockAction} 
                    disabled={bulkActionRunning}
                    variant={bulkAction === 'clock_in' ? 'success' : 'destructive'}
                    className="flex-1"
                  >
                    {bulkActionRunning ? (
                      <Spinner size="sm" className="text-white" />
                    ) : (
                      `Registrar ${bulkAction === 'clock_in' ? 'Entrada' : 'Salida'}`
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ClientOnly>
  )
}
