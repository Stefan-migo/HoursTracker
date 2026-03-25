'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Users, 
  Search, 
  Plus, 
  UserCheck, 
  UserX, 
  Edit, 
  X, 
  Check, 
  Trash2, 
  Shield, 
  Key,
  Mail
} from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Employee = {
  id: string
  email: string | null
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  invitation_status?: 'none' | 'pending' | 'active'
}

type FilterType = 'all' | 'active' | 'inactive'
type BulkAction = 'activate' | 'deactivate' | 'delete' | 'change_role' | 'send_invitation'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBulkActionModal, setShowBulkActionModal] = useState(false)
  const [selectedBulkAction, setSelectedBulkAction] = useState<BulkAction | null>(null)
  const [bulkActionRole, setBulkActionRole] = useState<'admin' | 'employee'>('employee')
  
  // Form data
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [createFormData, setCreateFormData] = useState({ email: '', full_name: '', sendInvitation: true })
  const [editFormData, setEditFormData] = useState({ 
    full_name: '', 
    email: '', 
    emailOrig: null as string | null,
    role: 'employee', 
    is_active: true 
  })
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    let result = employees

    if (filter === 'active') {
      result = result.filter(e => e.is_active)
    } else if (filter === 'inactive') {
      result = result.filter(e => !e.is_active)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(e =>
        e.full_name.toLowerCase().includes(searchLower) ||
        (e.email && e.email.toLowerCase().includes(searchLower))
      )
    }

    setFilteredEmployees(result)
  }, [employees, filter, search])

  async function fetchEmployees() {
    try {
      const res = await fetch('/api/admin/workers')
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (err) {
      console.error('Error fetching employees:', err)
      toast.error('Error al cargar trabajadores')
    } finally {
      setIsLoading(false)
    }
  }

  // Selection handlers
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

  // Bulk actions
  async function executeBulkAction() {
    if (!selectedBulkAction || selectedIds.size === 0) return

    setBulkActionLoading(true)
    try {
      const res = await fetch('/api/admin/workers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: selectedBulkAction,
          role: selectedBulkAction === 'change_role' ? bulkActionRole : undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message)
        setSelectedIds(new Set())
        setShowBulkActionModal(false)
        await fetchEmployees()
      } else {
        toast.error(data.error || 'Error en acción masiva')
      }
    } catch (err) {
      toast.error('Error al realizar acción masiva')
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Create employee
  async function handleInvite() {
    if (!createFormData.full_name) {
      toast.error('El nombre es requerido')
      return
    }

    if (createFormData.email && createFormData.sendInvitation) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(createFormData.email)) {
        toast.error('El formato del email es inválido')
        return
      }
    }

    setActionLoading('creating')
    try {
      const res = await fetch('/api/admin/invite-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createFormData.email,
          full_name: createFormData.full_name,
          sendInvitation: createFormData.sendInvitation && !!createFormData.email,
        }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success('Trabajador creado correctamente')
        if (data.invite_url) {
          setInviteUrl(data.invite_url)
        }
        setCreateFormData({ email: '', full_name: '', sendInvitation: true })
        await fetchEmployees()
        if (!data.invite_url) {
          setTimeout(() => {
            setShowCreateModal(false)
            setInviteUrl(null)
          }, 2000)
        }
      } else {
        toast.error(data.error || 'Error al crear trabajador')
      }
    } catch (err) {
      toast.error('Error al crear trabajador')
    } finally {
      setActionLoading(null)
    }
  }

  // Update employee
  async function handleUpdateEmployee() {
    if (!editingEmployee) return
    
    setActionLoading('updating')
    
    try {
      const res = await fetch('/api/admin/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEmployee.id,
          full_name: editFormData.full_name,
          email: editFormData.email,
          role: editFormData.role,
          is_active: editFormData.is_active,
        }),
      })
      
      if (res.ok) {
        toast.success('Trabajador actualizado')
        setShowEditModal(false)
        setEditingEmployee(null)
        await fetchEmployees()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al actualizar')
      }
    } catch (err) {
        toast.error('Error al actualizar trabajador')
    } finally {
      setActionLoading(null)
    }
  }

  // Delete employee
  async function handleDeleteEmployee() {
    if (!editingEmployee) return
    
    if (!confirm(`¿Estás seguro de eliminar a ${editingEmployee.full_name}? Esta acción no se puede deshacer.`)) {
      return
    }
    
    setActionLoading('deleting')
    
    try {
      const res = await fetch('/api/admin/workers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [editingEmployee.id],
          action: 'delete',
        }),
      })
      
      if (res.ok) {
        toast.success('Trabajador eliminado')
        setShowEditModal(false)
        setEditingEmployee(null)
        await fetchEmployees()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al eliminar')
      }
    } catch (err) {
      toast.error('Error al eliminar trabajador')
    } finally {
      setActionLoading(null)
    }
  }

  // Reset password
  async function handleResetPassword(email: string) {
    setActionLoading('resetting')
    try {
      const res = await fetch('/api/admin/workers/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Email de recuperación enviado')
      } else {
        toast.error(data.error || 'Error al enviar email')
      }
    } catch (err) {
      toast.error('Error al resetear contraseña')
    } finally {
      setActionLoading(null)
    }
  }

  // Send invitation
  async function handleSendInvitation() {
    if (!editingEmployee) return

    setActionLoading('inviting')
    try {
      const res = await fetch('/api/admin/workers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: [editingEmployee.id],
          action: 'send_invitation',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || 'Invitación enviada')
        await fetchEmployees()
      } else {
        toast.error(data.error || 'Error al enviar invitación')
      }
    } catch (err) {
      toast.error('Error al enviar invitación')
    } finally {
      setActionLoading(null)
    }
  }

  // Open edit modal
  function openEditModal(employee: Employee) {
    setEditingEmployee(employee)
    setEditFormData({
      full_name: employee.full_name,
      email: employee.email || '',
      emailOrig: employee.email,
      role: employee.role,
      is_active: employee.is_active,
    })
    setShowEditModal(true)
  }

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.is_active).length,
    inactive: employees.filter(e => !e.is_active).length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Trabajadores</h1>
          <p className="text-sm text-foreground-secondary mt-1">Gestiona los trabajadores del sistema</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Trabajador
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-foreground-secondary">Total</CardTitle>
                <Users className="h-4 w-4 text-foreground-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-foreground-secondary">Activos</CardTitle>
                <UserCheck className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-success">{stats.active}</div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-foreground-secondary">Inactivos</CardTitle>
                <UserX className="h-4 w-4 text-foreground-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-foreground-secondary">{stats.inactive}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <Card className="bg-accent-muted/50 border-accent/20">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-accent">
                {selectedIds.size} seleccionado(s):
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-success border-success/30 hover:bg-success-muted"
                onClick={() => { setSelectedBulkAction('activate'); setShowBulkActionModal(true); }}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Activar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-foreground-secondary border-border hover:bg-background-secondary"
                onClick={() => { setSelectedBulkAction('deactivate'); setShowBulkActionModal(true); }}
              >
                <UserX className="h-4 w-4 mr-1" />
                Desactivar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-accent border-accent/30 hover:bg-accent-muted"
                onClick={() => { setSelectedBulkAction('change_role'); setShowBulkActionModal(true); }}
              >
                <Shield className="h-4 w-4 mr-1" />
                Cambiar Rol
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-accent border-accent/30 hover:bg-accent-muted"
                onClick={() => { setSelectedBulkAction('send_invitation'); setShowBulkActionModal(true); }}
              >
                <Mail className="h-4 w-4 mr-1" />
                Enviar Invitación
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-error border-error/30 hover:bg-error-muted"
                onClick={() => { setSelectedBulkAction('delete'); setShowBulkActionModal(true); }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees Table */}
      <Card>
        <CardHeader className="border-b border-border-subtle">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="text-base font-semibold">Lista de Trabajadores</CardTitle>
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
                {(['all', 'active', 'inactive'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      filter === f
                        ? 'bg-accent text-white'
                        : 'bg-background text-foreground-secondary hover:bg-background-secondary'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="text-center text-foreground-secondary">Cargando...</div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-foreground-secondary">
              No hay trabajadores que coincidan con los filtros
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
                    <th className="text-left py-3 px-4 font-medium text-sm text-foreground-secondary">Nombre</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-foreground-secondary hidden sm:table-cell">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-foreground-secondary">Rol</th>
                    <th className="text-left py-3 px-4 font-medium text-sm text-foreground-secondary">Estado</th>
                    <th className="text-right py-3 px-4 font-medium text-sm text-foreground-secondary">Acciones</th>
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
                        <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>
                          {employee.role === 'admin' ? 'Admin' : 'Trabajador'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={employee.is_active ? 'success' : 'secondary'}>
                          {employee.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Employee Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Trabajador</DialogTitle>
          </DialogHeader>
          
          {inviteUrl ? (
            <div className="space-y-4">
              <div className="p-4 bg-success-muted border border-success/20 rounded-lg">
                <p className="font-semibold text-success mb-2">Empleado creado correctamente</p>
                <p className="text-sm text-foreground-secondary mb-3">
                  Copia y envía este enlace al empleado:
                </p>
                <div className="p-3 bg-background border border-border rounded font-mono text-xs break-all">
                  {inviteUrl}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(inviteUrl)}
                  className="mt-2"
                >
                  Copiar enlace
                </Button>
              </div>
              <Button onClick={() => {
                setShowCreateModal(false)
                setCreateFormData({ email: '', full_name: '', sendInvitation: true })
                setInviteUrl(null)
              }} className="w-full">
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nombre completo</label>
                <Input
                  value={createFormData.full_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, full_name: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Correo electrónico <span className="text-foreground-secondary">(opcional)</span></label>
                <Input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="juan@empresa.com"
                />
              </div>
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="send_invitation"
                  checked={createFormData.sendInvitation}
                  onChange={(e) => setCreateFormData({ ...createFormData, sendInvitation: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="send_invitation" className="text-sm text-foreground">
                  <span className="font-medium">Enviar invitación por email</span>
                  <span className="text-foreground-secondary block">
                    {!createFormData.email ? 'El trabajador no tendrá acceso a la plataforma' : 'El trabajador recibirá un correo con el enlace para crear su contraseña'}
                  </span>
                </label>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleInvite} disabled={actionLoading === 'creating'} className="flex-1">
                  {actionLoading === 'creating' ? (
                    <>
                      <Spinner size="sm" className="text-white mr-2" />
                      Creando...
                    </>
                  ) : 'Crear Trabajador'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Trabajador</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nombre completo</label>
              <Input
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Correo electrónico</label>
              <Input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="juan@empresa.com"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Rol</label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                className="w-full h-10 px-3 border border-border rounded-md bg-background text-foreground"
              >
                <option value="employee">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-foreground">
                Trabajador activo
              </label>
            </div>

            <div className="pt-2 border-t border-border">
              {editingEmployee?.email ? (
                editingEmployee.invitation_status === 'active' ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editingEmployee && handleResetPassword(editingEmployee.email!)}
                      disabled={actionLoading === 'resetting'}
                      className="w-full"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      {actionLoading === 'resetting' ? 'Enviando...' : 'Resetear Contraseña'}
                    </Button>
                    <p className="text-xs text-foreground-secondary mt-1 text-center">
                      Se enviará un email al trabajador para crear nueva contraseña
                    </p>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendInvitation}
                      disabled={actionLoading === 'inviting'}
                      className="w-full"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {actionLoading === 'inviting' ? 'Enviando...' : 'Enviar Invitación'}
                    </Button>
                    <p className="text-xs text-foreground-secondary mt-1 text-center">
                      El trabajador aún no ha creado su cuenta
                    </p>
                  </>
                )
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info('Agrega un email y guarda para enviar invitación')}
                    disabled={true}
                    className="w-full opacity-50"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Sin email
                  </Button>
                  <p className="text-xs text-foreground-secondary mt-1 text-center">
                    Este trabajador no tiene acceso a la plataforma
                  </p>
                </>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                variant="destructive" 
                onClick={handleDeleteEmployee} 
                disabled={actionLoading === 'deleting'}
              >
                {actionLoading === 'deleting' ? (
                  <>
                    <Spinner size="sm" className="text-white mr-2" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </>
                )}
              </Button>
              <div className="flex-1 flex gap-3">
                <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleUpdateEmployee} disabled={actionLoading === 'updating'} className="flex-1">
                  {actionLoading === 'updating' ? (
                    <>
                      <Spinner size="sm" className="text-white mr-2" />
                      Guardando...
                    </>
                  ) : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation Modal */}
      <Dialog open={showBulkActionModal} onOpenChange={setShowBulkActionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Acción Masiva</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-foreground-secondary">
              Estás a punto de <strong className="text-foreground">{
                selectedBulkAction === 'activate' ? 'activar' :
                selectedBulkAction === 'deactivate' ? 'desactivar' :
                selectedBulkAction === 'delete' ? 'eliminar' :
                selectedBulkAction === 'send_invitation' ? 'enviar invitación a' :
                'cambiar el rol de'
              }</strong> a <strong className="text-foreground">{selectedIds.size}</strong> trabajador(es).
            </p>

            {selectedBulkAction === 'change_role' && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nuevo rol</label>
                <select
                  value={bulkActionRole}
                  onChange={(e) => setBulkActionRole(e.target.value as 'admin' | 'employee')}
                  className="w-full h-10 px-3 border border-border rounded-md bg-background text-foreground"
                >
                <option value="worker">Trabajador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            )}

            {selectedBulkAction === 'delete' && (
              <div className="p-3 bg-error-muted border border-error/20 rounded-lg">
                <p className="text-sm text-error">
                  <strong>Advertencia:</strong> Esta acción no se puede deshacer. Los trabajadores eliminados perderán acceso al sistema.
                </p>
              </div>
            )}

            {selectedBulkAction === 'send_invitation' && (
              <div className="p-3 bg-accent-muted border border-accent/20 rounded-lg">
                <p className="text-sm text-accent">
                  <strong>Nota:</strong> Solo se enviarán invitaciones a trabajadores que tengan email registrado y no tengan cuenta activa.
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowBulkActionModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={executeBulkAction} 
                disabled={bulkActionLoading}
                variant={selectedBulkAction === 'delete' ? 'destructive' : 'default'}
                className="flex-1"
              >
                {bulkActionLoading ? (
                  <>
                    <Spinner size="sm" className="text-white mr-2" />
                    Procesando...
                  </>
                ) : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
