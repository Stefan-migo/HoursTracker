'use client'

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Clock, 
  MessageCircle, 
  Eye, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Trash2,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type { Mediation } from './hooks/useMediations'

interface MediationCardProps {
  mediation: Mediation
  onView: (mediation: Mediation) => void
  onContact?: (mediation: Mediation) => void
  onDelete?: (mediation: Mediation) => void
  showActions?: boolean
}

const statusConfig = {
  pending_review: {
    label: 'Pendiente de revisión',
    badge: 'bg-accent/10 text-accent border-accent/20',
    icon: Clock,
    description: 'Esperando primera acción',
  },
  in_discussion: {
    label: 'En conversación',
    badge: 'bg-warning/10 text-warning border-warning/20',
    icon: MessageCircle,
    description: 'Hay comunicación activa',
  },
  agreement_reached: {
    label: 'Acuerdo alcanzado',
    badge: 'bg-success/10 text-success border-success/20',
    icon: CheckCircle2,
    description: 'Ambas partes han acordado',
  },
  resolved: {
    label: 'Resuelto',
    badge: 'bg-success/10 text-success border-success/20',
    icon: CheckCircle2,
    description: 'Cambios aplicados',
  },
  closed_no_changes: {
    label: 'Cerrado',
    badge: 'bg-foreground-secondary/10 text-foreground-secondary border-foreground-secondary/20',
    icon: XCircle,
    description: 'Sin cambios aplicados',
  },
}

export function MediationCard({ 
  mediation, 
  onView, 
  onContact,
  onDelete,
  showActions = true 
}: MediationCardProps) {
  const status = statusConfig[mediation.status]
  const StatusIcon = status.icon

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDiff = (diffMinutes: number | null, diffHours: number | null) => {
    if (diffMinutes !== null && diffMinutes !== 0) {
      const sign = diffMinutes > 0 ? '+' : ''
      const absMinutes = Math.abs(diffMinutes)
      const hours = Math.floor(absMinutes / 60)
      const minutes = absMinutes % 60
      if (hours > 0) {
        return `${sign}${hours}h ${minutes}m`
      }
      return `${sign}${minutes}m`
    }
    if (diffHours !== null && diffHours !== 0) {
      const sign = diffHours > 0 ? '+' : ''
      return `${sign}${diffHours.toFixed(1)}h`
    }
    return null
  }

  const hasDiff = mediation.differences.hours_diff !== null && mediation.differences.hours_diff !== 0
  const diffText = formatDiff(
    mediation.differences.clock_in_diff_minutes || mediation.differences.clock_out_diff_minutes,
    mediation.differences.hours_diff
  )

  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-200',
      mediation.is_stale && 'border-warning/30'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-accent font-medium text-sm">
                {getInitials(mediation.employee?.full_name || 'Usuario')}
              </span>
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                {mediation.employee?.full_name || 'Trabajador'}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(mediation.date)}</span>
              </div>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn('flex items-center gap-1.5', status.badge)}
          >
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Difference indicator */}
        {hasDiff && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              {mediation.differences.hours_diff! > 0 ? (
                <TrendingUp className="h-4 w-4 text-warning" />
              ) : (
                <TrendingDown className="h-4 w-4 text-accent" />
              )}
              <span className={cn(
                'font-medium text-sm',
                mediation.differences.hours_diff! > 0 ? 'text-warning' : 'text-accent'
              )}>
                Diferencia: {diffText}
              </span>
            </div>
          </div>
        )}

        {/* Initial reason preview */}
        <p className="text-sm text-foreground-secondary line-clamp-2">
          <span className="font-medium text-foreground">Motivo:</span>{' '}
          {mediation.initial_reason}
        </p>

        {/* Stale warning */}
        {mediation.is_stale && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-warning/10 rounded-lg border border-warning/20">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
            <span className="text-xs text-warning">
              Sin actividad reciente. Considera contactar a la otra parte.
            </span>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="border-t border-border-subtle pt-3 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onView(mediation)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver Detalle
          </Button>
          
          {onContact && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1"
              onClick={() => onContact(mediation)}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Contactar
            </Button>
          )}
          
          {onDelete && mediation.status !== 'resolved' && mediation.status !== 'closed_no_changes' && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-error hover:text-error hover:bg-error/10"
              onClick={() => onDelete(mediation)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
