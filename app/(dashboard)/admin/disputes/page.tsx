'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AlertTriangle, MessageCircle, ArrowLeft, Loader2, Calendar, Clock, User } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { 
  useMediations, 
  useMediationDetail,
  type MediationStatus,
  type Mediation
} from '@/components/features/mediations'
import { MediationWorkspace } from '@/components/features/mediations'

const statusLabels: Record<MediationStatus, string> = {
  pending_review: 'Pendiente de revisión',
  in_discussion: 'En conversación',
  agreement_reached: 'Acuerdo alcanzado',
  resolved: 'Resuelto',
  closed_no_changes: 'Cerrado',
}

const statusColors: Record<MediationStatus, string> = {
  pending_review: 'bg-accent/10 text-accent border-accent/20',
  in_discussion: 'bg-warning/10 text-warning border-warning/20',
  agreement_reached: 'bg-success/10 text-success border-success/20',
  resolved: 'bg-success/10 text-success border-success/20',
  closed_no_changes: 'bg-foreground-secondary/10 text-foreground-secondary',
}

export default function AdminMediationsPage() {
  const [filter, setFilter] = useState<MediationStatus | 'all'>('all')
  const [selectedMediationId, setSelectedMediationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { mediations, summary, isLoading, refetch } = useMediations({
    status: filter,
  })

  const { mediation: selectedMediation, refetch: refetchDetail } = useMediationDetail(selectedMediationId)

  const filteredMediations = mediations.filter(m => 
    m.employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.employee.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleUpdate = () => {
    refetch()
    refetchDetail()
  }

  const handleClose = () => {
    setSelectedMediationId(null)
    refetch()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mediaciones</h1>
          <p className="text-foreground-secondary">
            Gestiona mediaciones colaborativas de registros de tiempo
          </p>
        </div>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-accent">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{summary.pending_review}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warning">En Discusión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{summary.in_discussion}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-success">Acuerdo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{summary.agreement_reached}</div>
            </CardContent>
          </Card>
          <Card className={summary.stale_count > 0 ? 'border-warning/50' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-error">Inactivas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-error">{summary.stale_count}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Lista de Mediaciones</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                placeholder="Buscar empleado..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64"
              />
              <div className="flex rounded-md border border-border">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${filter === 'all' ? 'bg-accent text-white' : 'bg-background text-foreground-secondary hover:bg-background-secondary'}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter('pending_review')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${filter === 'pending_review' ? 'bg-accent text-white' : 'bg-background text-foreground-secondary hover:bg-background-secondary'}`}
                >
                  Pendientes
                </button>
                <button
                  onClick={() => setFilter('in_discussion')}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${filter === 'in_discussion' ? 'bg-warning text-white' : 'bg-background text-foreground-secondary hover:bg-background-secondary'}`}
                >
                  En Discusión
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-foreground-secondary" />
            </div>
          ) : filteredMediations.length === 0 ? (
            <div className="text-center py-12 text-foreground-secondary">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay mediaciones {filter !== 'all' ? 'en este estado' : ''}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMediations.map((mediation) => (
                <MediationListItem
                  key={mediation.id}
                  mediation={mediation}
                  onClick={() => setSelectedMediationId(mediation.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedMediationId} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <DialogTitle>Mediación</DialogTitle>
            </div>
          </DialogHeader>
          
          {selectedMediation && (
            <MediationWorkspace
              mediationId={selectedMediationId!}
              onClose={handleClose}
              onUpdate={handleUpdate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// List item component
function MediationListItem({ 
  mediation, 
  onClick 
}: { 
  mediation: Mediation
  onClick: () => void 
}) {
  return (
    <div
      onClick={onClick}
      className="p-4 border border-border rounded-lg hover:border-accent/50 hover:bg-accent/5 cursor-pointer transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-background-secondary rounded-lg">
            <User className="h-5 w-5 text-foreground-secondary" />
          </div>
          <div>
            <div className="font-medium">{mediation.employee.full_name}</div>
            <div className="text-sm text-foreground-secondary">{mediation.employee.email}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-foreground-secondary">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(mediation.date)}</span>
              <span className="text-border">|</span>
              <Clock className="h-3 w-3" />
              <span>{formatDate(mediation.last_activity_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusColors[mediation.status]}>
            {statusLabels[mediation.status]}
          </Badge>
          
          {mediation.is_stale && (
            <Badge variant="outline" className="border-error text-error">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Inactiva
            </Badge>
          )}

          {(mediation.differences.hours_diff !== null && mediation.differences.hours_diff !== 0) && (
            <Badge variant="outline" className="border-warning text-warning">
              {mediation.differences.hours_diff > 0 ? '+' : ''}{mediation.differences.hours_diff.toFixed(1)}h
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
