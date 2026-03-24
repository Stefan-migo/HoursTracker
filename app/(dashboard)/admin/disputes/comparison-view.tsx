'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, CheckCircle, Mail, Edit } from 'lucide-react'
import { formatTime, formatDate, formatHours } from '@/lib/utils'

interface Dispute {
  id: string
  date: string
  employee_id: string
  admin_clock_in: string | null
  admin_clock_out: string | null
  admin_total_hours: number | null
  employee_clock_in: string | null
  employee_clock_out: string | null
  employee_total_hours: number | null
  reason: string
  status: 'pending' | 'resolved' | 'rejected'
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  employee: {
    full_name: string
    email: string
  }
}

interface ComparisonViewProps {
  dispute: Dispute
  onCorrectOfficial: (dispute: Dispute) => void
  onContactEmployee: (employee: { full_name: string; email: string }) => void
  onResolve: (disputeId: string) => void
  isLoading?: boolean
}

export function ComparisonView({ 
  dispute, 
  onCorrectOfficial, 
  onContactEmployee, 
  onResolve,
  isLoading 
}: ComparisonViewProps) {
  // Determine if there are differences
  const hasClockInDiff = dispute.admin_clock_in !== dispute.employee_clock_in
  const hasClockOutDiff = dispute.admin_clock_out !== dispute.employee_clock_out
  const hasTotalHoursDiff = dispute.admin_total_hours !== dispute.employee_total_hours
  const hasAnyDiff = hasClockInDiff || hasClockOutDiff || hasTotalHoursDiff

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{dispute.employee.full_name}</h3>
          <p className="text-sm text-foreground-secondary">{dispute.employee.email}</p>
          <p className="text-sm text-foreground-secondary mt-1">
            Fecha: {formatDate(dispute.date)}
          </p>
        </div>
        <Badge 
          variant={dispute.status === 'pending' ? 'destructive' : dispute.status === 'resolved' ? 'success' : 'secondary'}
        >
          {dispute.status === 'pending' ? 'Pendiente' : dispute.status === 'resolved' ? 'Resuelta' : 'Rechazada'}
        </Badge>
      </div>

      {/* Comparison Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Official Record (Admin) */}
        <Card className="border-accent/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent" />
              Registro Oficial (Admin)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-foreground-secondary">Entrada</label>
              <div className="text-sm font-medium text-foreground">
                {formatTime(dispute.admin_clock_in)}
              </div>
            </div>
            <div>
              <label className="text-xs text-foreground-secondary">Salida</label>
              <div className="text-sm font-medium text-foreground">
                {formatTime(dispute.admin_clock_out)}
              </div>
            </div>
            <div>
              <label className="text-xs text-foreground-secondary">Total Horas</label>
              <div className="text-sm font-medium text-foreground">
                {formatHours(dispute.admin_total_hours)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Record */}
        <Card className="border-success/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-success" />
              Registro del Trabajador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-foreground-secondary">Entrada</label>
              <div className={`text-sm font-medium ${hasClockInDiff ? 'text-success' : 'text-foreground'}`}>
                {formatTime(dispute.employee_clock_in)}
              </div>
            </div>
            <div>
              <label className="text-xs text-foreground-secondary">Salida</label>
              <div className={`text-sm font-medium ${hasClockOutDiff ? 'text-success' : 'text-foreground'}`}>
                {formatTime(dispute.employee_clock_out)}
              </div>
            </div>
            <div>
              <label className="text-xs text-foreground-secondary">Total Horas</label>
              <div className={`text-sm font-medium ${hasTotalHoursDiff ? 'text-success' : 'text-foreground'}`}>
                {formatHours(dispute.employee_total_hours)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Differences Summary */}
        <Card className={hasAnyDiff ? 'border-warning/50 bg-warning-muted' : 'border-success/30'}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {hasAnyDiff ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Diferencias Detectadas
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-success" />
                  Sin Diferencias
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hasClockInDiff && (
              <div className="text-sm">
                <span className="text-foreground-secondary">Entrada:</span>
                <span className="ml-2 text-error">{formatTime(dispute.admin_clock_in)}</span>
                <span className="mx-2 text-foreground-secondary">→</span>
                <span className="text-success">{formatTime(dispute.employee_clock_in)}</span>
              </div>
            )}
            {hasClockOutDiff && (
              <div className="text-sm">
                <span className="text-foreground-secondary">Salida:</span>
                <span className="ml-2 text-error">{formatTime(dispute.admin_clock_out)}</span>
                <span className="mx-2 text-foreground-secondary">→</span>
                <span className="text-success">{formatTime(dispute.employee_clock_out)}</span>
              </div>
            )}
            {hasTotalHoursDiff && (
              <div className="text-sm">
                <span className="text-foreground-secondary">Horas:</span>
                <span className="ml-2 text-error">{formatHours(dispute.admin_total_hours)}</span>
                <span className="mx-2 text-foreground-secondary">→</span>
                <span className="text-success">{formatHours(dispute.employee_total_hours)}</span>
              </div>
            )}
            {!hasAnyDiff && (
              <p className="text-sm text-foreground-secondary">Los registros coinciden</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Reason */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Motivo de la Disputa</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{dispute.reason}</p>
        </CardContent>
      </Card>

      {/* Actions */}
      {dispute.status === 'pending' && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onContactEmployee(dispute.employee)}
            disabled={isLoading}
          >
            <Mail className="h-4 w-4 mr-2" />
            Contactar Trabajador
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onCorrectOfficial(dispute)}
            disabled={isLoading}
          >
            <Edit className="h-4 w-4 mr-2" />
            Corregir Registro
          </Button>
          <Button
            className="flex-1"
            onClick={() => onResolve(dispute.id)}
            disabled={isLoading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Resolver
          </Button>
        </div>
      )}
    </div>
  )
}
