'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTime, formatHours } from '@/lib/utils'
import { 
  formatToLocalTime, 
  getLocalTimeInMinutes,
  getLocalHours,
  getLocalMinutes
} from '@/lib/utils/date-utils'

interface TimeRecord {
  clock_in: string | null
  clock_out: string | null
  total_hours: number | null
  marked_by?: string
  edited_at?: string | null
}

interface ComparisonViewProps {
  adminRecord: TimeRecord | null
  employeeRecord: TimeRecord | null
  proposedValues?: {
    clock_in: string | null
    clock_out: string | null
    total_hours: number | null
    proposed_by: 'admin' | 'employee'
    proposed_at: string
  } | null
  showDifferencesOnly?: boolean
  className?: string
}

export function ComparisonView({
  adminRecord,
  employeeRecord,
  proposedValues,
  showDifferencesOnly = true,
  className,
}: ComparisonViewProps) {
  // Calculate differences
  const clockInDiff = calculateDiff(adminRecord?.clock_in, employeeRecord?.clock_in, 'time')
  const clockOutDiff = calculateDiff(adminRecord?.clock_out, employeeRecord?.clock_out, 'time')
  const hoursDiff = calculateDiff(adminRecord?.total_hours, employeeRecord?.total_hours, 'hours')

  const hasClockInDiff = clockInDiff !== 0
  const hasClockOutDiff = clockOutDiff !== 0
  const hasHoursDiff = hoursDiff !== 0
  const hasAnyDiff = hasClockInDiff || hasClockOutDiff || hasHoursDiff

  // Calculate dynamic time range based on actual times
  const allTimes = [
    adminRecord?.clock_in,
    adminRecord?.clock_out,
    employeeRecord?.clock_in,
    employeeRecord?.clock_out,
    proposedValues?.clock_in,
    proposedValues?.clock_out,
  ].filter((t): t is string => t !== null && t !== undefined)

  let minHour = 7
  let maxHour = 20

  if (allTimes.length > 0) {
    const hours = allTimes.map(t => new Date(t).getHours())
    const mins = allTimes.map(t => new Date(t).getMinutes())
    const minTime = Math.min(...hours.map((h, i) => h * 60 + mins[i]))
    const maxTime = Math.max(...hours.map((h, i) => h * 60 + mins[i]))
    minHour = Math.max(0, Math.floor(minTime / 60) - 1)
    maxHour = Math.min(24, Math.ceil(maxTime / 60) + 1)
  }

  // If showing only differences and there are none, show a message
  if (showDifferencesOnly && !hasAnyDiff) {
    return (
      <Card className={cn('bg-success/5 border-success/20', className)}>
        <CardContent className="flex items-center gap-3 py-6">
          <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="font-medium text-foreground">Los registros coinciden</p>
            <p className="text-sm text-foreground-secondary">No hay diferencias entre el registro oficial y el del trabajador</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Visual Timeline Comparison */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-background-secondary/50 border-b border-border">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-foreground-secondary" />
            Comparación Visual
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Admin Timeline */}
          <TimelineRow
            label="Registro Oficial"
            record={adminRecord}
            color="accent"
            minHour={minHour}
            maxHour={maxHour}
          />

          {/* Employee Timeline */}
          <TimelineRow
            label="Registro Trabajador"
            record={employeeRecord}
            color={hasAnyDiff ? 'warning' : 'success'}
            minHour={minHour}
            maxHour={maxHour}
          />

          {/* Time markers */}
          <TimeMarkers minHour={minHour} maxHour={maxHour} />
        </CardContent>
      </Card>

      {/* Differences Summary */}
      {hasAnyDiff && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Diferencias Detectadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <DifferenceBadge
                label="Entrada"
                adminValue={adminRecord?.clock_in}
                employeeValue={employeeRecord?.clock_in}
                diff={clockInDiff}
                type="time"
              />
              <DifferenceBadge
                label="Salida"
                adminValue={adminRecord?.clock_out}
                employeeValue={employeeRecord?.clock_out}
                diff={clockOutDiff}
                type="time"
              />
              <DifferenceBadge
                label="Total Horas"
                adminValue={adminRecord?.total_hours}
                employeeValue={employeeRecord?.total_hours}
                diff={hoursDiff}
                type="hours"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proposed Values */}
      {proposedValues && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              Valores Propuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground-secondary">Propuesto por:</span>
                <Badge variant="outline" className="border-accent/30 text-accent">
                  {proposedValues.proposed_by === 'admin' ? 'Administrador' : 'Empleado'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <ProposedValueBadge
                  label="Entrada"
                  value={proposedValues.clock_in}
                  type="time"
                />
                <ProposedValueBadge
                  label="Salida"
                  value={proposedValues.clock_out}
                  type="time"
                />
                <ProposedValueBadge
                  label="Total"
                  value={proposedValues.total_hours}
                  type="hours"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface TimelineRowProps {
  label: string
  record: TimeRecord | null
  color: 'accent' | 'warning' | 'success'
  minHour?: number
  maxHour?: number
}

function TimelineRow({ label, record, color, minHour = 7, maxHour = 20 }: TimelineRowProps) {
  const totalHours = maxHour - minHour
  const totalMinutes = totalHours * 60

  const getPosition = (time: string | null) => {
    if (!time) return 0
    const date = new Date(time)
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const totalMinutesFromStart = (hours - minHour) * 60 + minutes
    if (totalMinutesFromStart < 0) return 0
    if (totalMinutesFromStart > totalMinutes) return 100
    return (totalMinutesFromStart / totalMinutes) * 100
  }

  const getWidth = (start: string | null, end: string | null) => {
    if (!start || !end) return 0
    const startPos = getPosition(start)
    const endPos = getPosition(end)
    return Math.max(0, endPos - startPos)
  }

  const colorClasses = {
    accent: 'bg-accent/20 border-accent',
    warning: 'bg-warning/20 border-warning',
    success: 'bg-success/20 border-success',
  }

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {record?.marked_by && (
            <span className="text-xs text-foreground-secondary">
              por {record.marked_by}
            </span>
          )}
        </div>
        <span className="text-sm text-foreground-secondary">
          {record?.clock_in ? formatToLocalTime(record.clock_in) : '--:--'} - {' '}
          {record?.clock_out ? formatToLocalTime(record.clock_out) : '--:--'}
        </span>
      </div>

      <div className="relative h-8 bg-background-secondary rounded-full overflow-hidden">
        {record?.clock_in && record?.clock_out ? (
          <>
            {/* Working hours bar */}
            <div
              className={cn('absolute h-full rounded-full border', colorClasses[color])}
              style={{
                left: `${getPosition(record.clock_in)}%`,
                width: `${getWidth(record.clock_in, record.clock_out)}%`,
              }}
            />
            {/* Start marker */}
            <div
              className={cn('absolute top-0 bottom-0 w-1 rounded-full', 
                color === 'accent' ? 'bg-accent' : color === 'warning' ? 'bg-warning' : 'bg-success'
              )}
              style={{ left: `${getPosition(record.clock_in)}%` }}
            />
            {/* End marker */}
            <div
              className={cn('absolute top-0 bottom-0 w-1 rounded-full',
                color === 'accent' ? 'bg-accent' : color === 'warning' ? 'bg-warning' : 'bg-success'
              )}
              style={{ left: `${getPosition(record.clock_out)}%` }}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-foreground-secondary">
            Sin registro
          </div>
        )}
      </div>
    </div>
  )
}

function TimeMarkers({ minHour, maxHour }: { minHour: number; maxHour: number }) {
  const totalHours = maxHour - minHour
  const markers = []
  const step = totalHours <= 6 ? 1 : totalHours <= 12 ? 2 : 3

  for (let h = minHour; h <= maxHour; h += step) {
    markers.push(h)
  }
  if (markers[markers.length - 1] !== maxHour) {
    markers.push(maxHour)
  }

  return (
    <div className="mt-4 flex justify-between text-xs text-foreground-secondary px-2">
      {markers.map((hour, i) => (
        <span key={i}>{hour.toString().padStart(2, '0')}:00</span>
      ))}
    </div>
  )
}

interface DifferenceBadgeProps {
  label: string
  adminValue: string | number | null | undefined
  employeeValue: string | number | null | undefined
  diff: number
  type: 'time' | 'hours'
}

function DifferenceBadge({ label, adminValue, employeeValue, diff, type }: DifferenceBadgeProps) {
  const isDifferent = diff !== 0

  const formatDiff = (value: number) => {
    if (type === 'time') {
      const absMinutes = Math.abs(value)
      const hours = Math.floor(absMinutes / 60)
      const minutes = absMinutes % 60
      if (hours > 0) {
        return `${value > 0 ? '+' : '-'}${hours}h ${minutes}m`
      }
      return `${value > 0 ? '+' : '-'}${minutes}m`
    } else {
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}h`
    }
  }

  const formatValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '-'
    if (type === 'time') {
      return formatTime(value as string)
    }
    return formatHours(value as number)
  }

  return (
    <div className={cn(
      'flex flex-col items-center p-3 rounded-lg border',
      isDifferent 
        ? 'bg-warning/10 border-warning/30' 
        : 'bg-success/10 border-success/30'
    )}>
      <span className="text-xs text-foreground-secondary uppercase tracking-wider mb-1">
        {label}
      </span>
      <div className="flex items-center gap-1 text-sm">
        <span className={cn(
          'font-medium',
          isDifferent ? 'text-warning' : 'text-success'
        )}>
          {formatValue(adminValue)}
        </span>
        {isDifferent && (
          <>
            <ArrowRight className="h-3 w-3 text-foreground-secondary" />
            <span className="font-medium text-foreground">
              {formatValue(employeeValue)}
            </span>
          </>
        )}
      </div>
      {isDifferent && (
        <Badge variant="outline" className="mt-2 text-xs border-warning/30 text-warning">
          {formatDiff(diff)}
        </Badge>
      )}
      {!isDifferent && (
        <Badge variant="outline" className="mt-2 text-xs border-success/30 text-success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Igual
        </Badge>
      )}
    </div>
  )
}

interface ProposedValueBadgeProps {
  label: string
  value: string | number | null
  type: 'time' | 'hours'
}

function ProposedValueBadge({ label, value, type }: ProposedValueBadgeProps) {
  const formatValue = (val: string | number | null) => {
    if (val === null) return '-'
    if (type === 'time') {
      return formatTime(val as string)
    }
    return formatHours(val as number)
  }

  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-background border border-accent/20">
      <span className="text-xs text-foreground-secondary uppercase tracking-wider mb-1">
        {label}
      </span>
      <span className="text-sm font-medium text-accent">
        {formatValue(value)}
      </span>
    </div>
  )
}

// Helper functions
function normalizeToMinutes(isoString: string | null | undefined): number | null {
  if (!isoString) return null
  return getLocalTimeInMinutes(isoString)
}

function calculateDiff(
  adminValue: string | number | null | undefined,
  employeeValue: string | number | null | undefined,
  type: 'time' | 'hours'
): number {
  if (adminValue === null || adminValue === undefined || employeeValue === null || employeeValue === undefined) {
    return 0
  }

  if (type === 'time') {
    const adminMinutes = normalizeToMinutes(adminValue as string)
    const employeeMinutes = normalizeToMinutes(employeeValue as string)
    if (adminMinutes === null || employeeMinutes === null) return 0
    return adminMinutes - employeeMinutes
  } else {
    return (adminValue as number) - (employeeValue as number)
  }
}
