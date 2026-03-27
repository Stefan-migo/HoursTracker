'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { AlertTriangle, MessageCircle, Loader2, Calendar, Clock } from 'lucide-react'
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
  in_discussion: 'En mediación',
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

export default function WorkerMediationsPage() {
  const [filter, setFilter] = useState<MediationStatus | 'all'>('all')
  const [selectedMediationId, setSelectedMediationId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')

  const { mediations, summary, isLoading, refetch } = useMediations({
    status: 'all',
  })

  const { mediation: selectedMediation } = useMediationDetail(selectedMediationId)

  const handleUpdate = () => {
    refetch()
  }

  const handleClose = () => {
    setSelectedMediationId(null)
    refetch()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mis Mediaciones</h1>
        <p className="text-foreground-secondary">
          Gestiona mediaciones de registros de tiempo con el administrador
        </p>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Activas</CardTitle>
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
              <CardTitle className="text-sm font-medium text-warning">En Mediación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{summary.in_discussion}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-success">Resueltas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {summary.resolved || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* My Mediations List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Mis Mediaciones</CardTitle>
            <div className="flex rounded-md border border-border">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === 'active' ? 'bg-accent text-white' : 'bg-background text-foreground-secondary hover:bg-background-secondary'}`}
              >
                Activas
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-accent text-white' : 'bg-background text-foreground-secondary hover:bg-background-secondary'}`}
              >
                Historial
              </button>
            </div>
          </div>
          {activeTab === 'active' && (
            <div className="flex rounded-md border border-border mt-4 w-fit">
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
                En Mediación
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-foreground-secondary" />
            </div>
          ) : mediations.filter(m => activeTab === 'active' 
            ? m.status === 'pending_review' || m.status === 'in_discussion'
            : m.status === 'resolved' || m.status === 'closed_no_changes').length === 0 ? (
            <div className="text-center py-12 text-foreground-secondary">
              {activeTab === 'active' ? (
                <>
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium text-foreground">No hay inconsistencias en tus registros</p>
                  <p className="text-sm mt-1">Todos tus registros están correctos</p>
                </>
              ) : (
                <>
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay mediaciones en el historial</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {mediations
                .filter(m => activeTab === 'active' 
                  ? m.status === 'pending_review' || m.status === 'in_discussion'
                  : m.status === 'resolved' || m.status === 'closed_no_changes')
                .map((mediation) => (
                  <MediationListItem
                    key={mediation.id}
                    mediation={mediation}
                    onClick={() => setSelectedMediationId(mediation.id)}
                    isHistory={activeTab === 'history'}
                  />
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedMediationId} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <VisuallyHidden>
            <DialogTitle>Mi Mediación</DialogTitle>
          </VisuallyHidden>
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

// List item component for mediations
function MediationListItem({ 
  mediation, 
  onClick,
  isHistory = false
}: { 
  mediation: Mediation
  onClick: () => void
  isHistory?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={isHistory 
        ? "p-4 border border-border rounded-lg bg-background-secondary/30 cursor-pointer transition-colors"
        : "p-4 border border-border rounded-lg hover:border-accent/50 hover:bg-accent/5 cursor-pointer transition-colors"
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-background-secondary rounded-lg">
            <Calendar className="h-5 w-5 text-foreground-secondary" />
          </div>
          <div>
            <div className="font-medium">{formatDate(mediation.date)}</div>
            <div className="flex items-center gap-2 mt-1 text-xs text-foreground-secondary">
              <Clock className="h-3 w-3" />
              <span>Última actividad: {formatDate(mediation.last_activity_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusColors[mediation.status]}>
            {statusLabels[mediation.status]}
          </Badge>
          
          {mediation.is_stale && !isHistory && (
            <Badge variant="outline" className="border-error text-error">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Inactiva
            </Badge>
          )}

          {mediation.differences.hours_diff !== null && mediation.differences.hours_diff !== 0 && (
            <Badge variant="outline" className="border-warning text-warning">
              {mediation.differences.hours_diff > 0 ? '+' : ''}{mediation.differences.hours_diff.toFixed(1)}h
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}
