'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  MessageCircle, 
  X, 
  CheckCircle2,
  Send,
  Save,
  ArrowLeft,
  Shield,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { StaleNotification } from './stale-notification'
import { ComparisonView } from './comparison-view'
import { useMediationDetail } from './hooks/useMediations'
import { toast } from 'sonner'

interface MediationWorkspaceProps {
  mediationId: string
  onClose: () => void
  onUpdate?: () => void
}

const statusLabels: Record<string, string> = {
  pending_review: 'Pendiente de revisión',
  in_discussion: 'En conversación',
  agreement_reached: 'Acuerdo alcanzado',
  resolved: 'Resuelto',
  closed_no_changes: 'Cerrado',
}

const statusColors: Record<string, string> = {
  pending_review: 'bg-accent/10 text-accent border-accent/20',
  in_discussion: 'bg-warning/10 text-warning border-warning/20',
  agreement_reached: 'bg-success/10 text-success border-success/20',
  resolved: 'bg-success/10 text-success border-success/20',
  closed_no_changes: 'bg-foreground-secondary/10 text-foreground-secondary',
}

export function MediationWorkspace({ mediationId, onClose, onUpdate }: MediationWorkspaceProps) {
  const { mediation, isLoading, updateMediation, refetch } = useMediationDetail(mediationId)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state for editing records
  const [adminForm, setAdminForm] = useState({
    clock_in: '',
    clock_out: '',
    total_hours: '',
  })
  const [employeeForm, setEmployeeForm] = useState({
    clock_in: '',
    clock_out: '',
    total_hours: '',
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  if (!mediation) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground-secondary">No se encontró la mediación</p>
        <Button onClick={onClose} className="mt-4">
          Volver
        </Button>
      </div>
    )
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    
    setIsSubmitting(true)
    try {
      await updateMediation('comment', { comment })
      setComment('')
      onUpdate?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAccept = async () => {
    setIsSubmitting(true)
    try {
      await updateMediation('accept')
      onUpdate?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = async () => {
    if (!confirm('¿Estás seguro de cerrar esta mediación?')) return
    
    setIsSubmitting(true)
    try {
      await updateMediation('close', { close_reason: 'Cerrado por el usuario' })
      toast.success('Mediación cerrada')
      onClose()
      onUpdate?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateRecord = async (timeLogId: string, isAdmin: boolean) => {
    const form = isAdmin ? adminForm : employeeForm
    
    if (!form.clock_in && !form.clock_out && !form.total_hours) {
      toast.error('No hay cambios para guardar')
      return
    }

    setIsSubmitting(true)
    try {
      await updateMediation('update_record', {
        time_log_id: timeLogId,
        clock_in: form.clock_in || null,
        clock_out: form.clock_out || null,
        total_hours: form.total_hours ? parseFloat(form.total_hours) : null,
        reason: 'Ajuste en mediación',
      })
      
      // Reset form
      if (isAdmin) {
        setAdminForm({ clock_in: '', clock_out: '', total_hours: '' })
      } else {
        setEmployeeForm({ clock_in: '', clock_out: '', total_hours: '' })
      }
      
      onUpdate?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const otherParty = mediation.permissions.is_admin 
    ? { name: mediation.employee.name, email: mediation.employee.email, role: 'employee' as const }
    : { name: 'Administrador', email: '', role: 'admin' as const }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">
            Mediación - {formatDate(mediation.date)}
          </h2>
          <p className="text-sm text-foreground-secondary">
            {mediation.employee.name}
          </p>
        </div>
        <Badge variant="outline" className={statusColors[mediation.status]}>
          {statusLabels[mediation.status]}
        </Badge>
      </div>

      {/* Stale Notification */}
      {mediation.activity.is_stale && (
        <StaleNotification
          hoursInactive={mediation.activity.stale_hours}
          otherParty={otherParty}
          lastAdminActivity={mediation.activity.admin_last_activity_at}
          lastEmployeeActivity={mediation.activity.employee_last_activity_at}
          isAdmin={mediation.permissions.is_admin}
        />
      )}

      {/* Comparison View */}
      <ComparisonView
        adminRecord={mediation.admin_record ? {
          clock_in: mediation.admin_record.clock_in,
          clock_out: mediation.admin_record.clock_out,
          total_hours: mediation.admin_record.total_hours,
          marked_by: mediation.admin_record.marked_by,
          edited_at: mediation.admin_record.edited_at,
        } : null}
        employeeRecord={mediation.employee_record ? {
          clock_in: mediation.employee_record.clock_in,
          clock_out: mediation.employee_record.clock_out,
          total_hours: mediation.employee_record.total_hours,
          marked_by: mediation.employee_record.marked_by,
          edited_at: mediation.employee_record.edited_at,
        } : null}
        proposedValues={mediation.proposed}
        showDifferencesOnly={false}
      />

      {/* Edit Forms */}
      {mediation.status !== 'resolved' && mediation.status !== 'closed_no_changes' && (
        <>
          {/* Admin Edit Form */}
          {mediation.permissions.is_admin && mediation.admin_record && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-accent" />
                    Editar Registro Oficial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-foreground-secondary">Entrada</label>
                      <Input
                        type="time"
                        value={adminForm.clock_in}
                        onChange={(e) => setAdminForm({ ...adminForm, clock_in: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary">Salida</label>
                      <Input
                        type="time"
                        value={adminForm.clock_out}
                        onChange={(e) => setAdminForm({ ...adminForm, clock_out: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-foreground-secondary">Total Horas</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={adminForm.total_hours}
                      onChange={(e) => setAdminForm({ ...adminForm, total_hours: e.target.value })}
                      className="mt-1"
                      placeholder="Ej: 8.5"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleUpdateRecord(mediation.admin_record!.id, true)}
                    disabled={isSubmitting}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-accent/5 border-accent/20">
                <CardContent className="py-6">
                  <p className="text-sm text-foreground-secondary">
                    <strong className="text-foreground">¿Por qué editar?</strong><br /><br />
                    Si consideras que el empleado tiene razón, ajusta el registro oficial para que coincida. Esto ayudará a resolver la mediación.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employee Edit Form */}
          {!mediation.permissions.is_admin && mediation.employee_record && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-foreground-secondary" />
                    Editar Mi Registro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-foreground-secondary">Entrada</label>
                      <Input
                        type="time"
                        value={employeeForm.clock_in}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, clock_in: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-secondary">Salida</label>
                      <Input
                        type="time"
                        value={employeeForm.clock_out}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, clock_out: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-foreground-secondary">Total Horas</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={employeeForm.total_hours}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, total_hours: e.target.value })}
                      className="mt-1"
                      placeholder="Ej: 8.5"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleUpdateRecord(mediation.employee_record!.id, false)}
                    disabled={isSubmitting}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-accent/5 border-accent/20">
                <CardContent className="py-6">
                  <p className="text-sm text-foreground-secondary">
                    <strong className="text-foreground">¿Por qué editar?</strong><br /><br />
                    Si consideras que el administrador tiene razón, ajusta tu registro para que coincida. Esto ayudará a resolver la mediación.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Comments / Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Conversación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto pr-4">
            <div className="space-y-4">
              {mediation.notes.length === 0 ? (
                <p className="text-center text-sm text-foreground-secondary py-8">
                  No hay mensajes aún. Inicia la conversación.
                </p>
              ) : (
                mediation.notes.map((note) => (
                  <div
                    key={note.id}
                    className={cn(
                      'flex gap-3 p-3 rounded-lg',
                      note.type === 'system' 
                        ? 'bg-background-secondary/50 text-foreground-secondary text-sm' 
                        : note.author_role === 'admin'
                        ? 'bg-accent/5'
                        : 'bg-background-secondary'
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {note.author_name}
                        </span>
                        <span className="text-xs text-foreground-secondary">
                          {formatDate(note.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Comment */}
          {mediation.status !== 'resolved' && mediation.status !== 'closed_no_changes' && (
            <div className="mt-4 flex gap-2">
              <textarea
                value={comment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 min-h-[80px] p-3 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <Button
                className="self-end"
                onClick={handleComment}
                disabled={!comment.trim() || isSubmitting}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {mediation.permissions.can_accept && mediation.proposed && (
          <Button
            className="flex-1 bg-success hover:bg-success/90"
            onClick={handleAccept}
            disabled={isSubmitting}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Aceptar Propuesta
          </Button>
        )}
        
        {mediation.permissions.can_close && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Cerrar Mediación
          </Button>
        )}
      </div>
    </div>
  )
}
