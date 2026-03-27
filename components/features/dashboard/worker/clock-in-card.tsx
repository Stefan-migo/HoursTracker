'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { LogOut, Clock, CheckCircle2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  formatToLocalTime, 
  formatElapsedTime,
  createLocalNowISO,
  createLocalDateTime,
  getCurrentLocalDate
} from '@/lib/utils/date-utils'
import type { WorkState } from '@/lib/messages/types'
import { TimeInput } from './time-input'
import { InlineEditField } from './inline-edit-field'

interface ClockInCardProps {
  clockIn: string | null
  clockOut: string | null
  totalHours: number | null
  isLoading: boolean
  actionLoading: 'clock_in' | 'clock_out' | 'update' | 'create' | 'delete' | null
  onClockOut: () => void
  onUpdateManual?: (data: { clockIn?: string; clockOut?: string }) => Promise<boolean>
  onCreateRecord?: (data: { clockIn?: string; clockOut?: string }) => Promise<boolean>
  onDelete?: () => Promise<boolean>
  canEdit?: boolean
}

function useElapsedTimer(clockIn: string | null, isWorking: boolean) {
  const [elapsedTime, setElapsedTime] = useState('00:00:00')

  useEffect(() => {
    if (!isWorking || !clockIn) {
      setElapsedTime('00:00:00')
      return
    }

    // Parse the ISO string - if it has 'Z', JavaScript converts UTC to local automatically
    // If no timezone info, it's treated as local time (which is wrong for stored UTC values)
    const startDate = new Date(clockIn)
    if (isNaN(startDate.getTime())) {
      setElapsedTime('00:00:00')
      return
    }

    const startTime = startDate.getTime()

    const tick = () => {
      const now = Date.now()
      const diff = now - startTime

      if (diff < 0) {
        setElapsedTime('00:00:00')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setElapsedTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }

    tick()
    const interval = setInterval(tick, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [isWorking, clockIn])

  return elapsedTime
}

function formatTimeForInput(isoString: string | null): string | null {
  if (!isoString) return null
  // Use formatToLocalTime which handles timezone conversion correctly
  return formatToLocalTime(isoString)
}

function parseTimeToISO(timeString: string | null): string | null {
  if (!timeString) return null
  // Just return the time string as-is (HH:MM format from input type="time")
  // Backend will handle the conversion
  return timeString
}

export function ClockInCard({
  clockIn,
  clockOut,
  totalHours,
  isLoading,
  actionLoading,
  onClockOut,
  onUpdateManual,
  onCreateRecord,
  onDelete,
  canEdit = false,
}: ClockInCardProps) {
  const hasCheckedIn = !!clockIn
  const hasCheckedOut = !!clockOut
  const isWorking = hasCheckedIn && !hasCheckedOut
  const isNewRecord = !clockIn && !clockOut

  const workState: WorkState = useMemo(() => {
    if (!hasCheckedIn) return 'pending'
    if (isWorking) return 'working'
    return 'completed'
  }, [hasCheckedIn, isWorking])

  const elapsedTime = useElapsedTimer(clockIn, isWorking)

  const [editingClockIn, setEditingClockIn] = useState(false)
  const [editingClockOut, setEditingClockOut] = useState(false)
  const [editClockInValue, setEditClockInValue] = useState<string | null>(null)
  const [editClockOutValue, setEditClockOutValue] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setEditClockInValue(formatTimeForInput(clockIn))
    setEditClockOutValue(formatTimeForInput(clockOut))
  }, [clockIn, clockOut])

  const handleSave = useCallback(async () => {
    setIsSaving(true)

    if (isNewRecord) {
      if (!onCreateRecord) {
        setIsSaving(false)
        return
      }
      const data: { clockIn?: string; clockOut?: string } = {}
      if (editingClockIn && editClockInValue) {
        data.clockIn = parseTimeToISO(editClockInValue) ?? undefined
      }
      if (editingClockOut && editClockOutValue) {
        data.clockOut = parseTimeToISO(editClockOutValue) ?? undefined
      }
      await onCreateRecord(data)
    } else {
      if (!onUpdateManual) {
        setIsSaving(false)
        return
      }
      const data: { clockIn?: string; clockOut?: string } = {}
      if (editingClockIn && editClockInValue) {
        const newClockIn = parseTimeToISO(editClockInValue)
        if (newClockIn && newClockIn !== clockIn) {
          data.clockIn = newClockIn
        }
      }
      if (editingClockOut && editClockOutValue) {
        const newClockOut = parseTimeToISO(editClockOutValue)
        if (newClockOut && newClockOut !== clockOut) {
          data.clockOut = newClockOut
        }
      }
      await onUpdateManual(data)
    }

    setEditingClockIn(false)
    setEditingClockOut(false)
    setIsSaving(false)
  }, [isNewRecord, editingClockIn, editingClockOut, editClockInValue, editClockOutValue, onUpdateManual, onCreateRecord, clockIn, clockOut])

  const handleCancel = useCallback(() => {
    setEditingClockIn(false)
    setEditingClockOut(false)
    setEditClockInValue(formatTimeForInput(clockIn))
    setEditClockOutValue(formatTimeForInput(clockOut))
  }, [clockIn, clockOut])

  const getTitle = () => {
    if (isNewRecord) return 'Registra tu jornada de hoy'
    switch (workState) {
      case 'working': return 'En jornada'
      case 'completed': return '¡Buen trabajo!'
      default: return 'Registra tu jornada de hoy'
    }
  }

  const getSubtitle = () => {
    if (isNewRecord) return 'Ingresa la hora de entrada y salida de tu jornada'
    switch (workState) {
      case 'working': return `Jornada iniciada a las ${formatTimeForInput(clockIn) || '--:--'}`
      case 'completed': return 'Registro completado'
      default: return ''
    }
  }

  if (isLoading) {
    return (
      <Card className="border-2 border-dashed border-border-subtle rounded-2xl p-8">
        <CardContent className="p-0 flex flex-col items-center justify-center min-h-[280px]">
          <div className="w-20 h-20 rounded-full bg-background-tertiary animate-pulse mb-6" />
          <div className="h-6 w-48 bg-background-tertiary rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-background-tertiary rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  const displayClockIn = formatTimeForInput(clockIn) || '--:--'
  const displayClockOut = formatTimeForInput(clockOut) || '--:--'
  const isEditingAny = editingClockIn || editingClockOut
  const isClockInBeforeClockOut = editClockInValue && editClockOutValue && editClockInValue >= editClockOutValue

  return (
    <Card className={cn(
      "rounded-2xl overflow-hidden",
      workState === 'working' 
        ? 'bg-accent-muted/30 border border-accent/20' 
        : 'bg-success-muted/50 border border-success/30'
    )}>
      <CardContent className="p-6 sm:p-8 text-center">
        <div className={cn(
          "w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center",
          workState === 'working' ? 'bg-accent/20' : 'bg-success/20'
        )}>
          {workState === 'working' ? (
            <Clock className="h-10 w-10 text-accent animate-pulse" />
          ) : (
            <CheckCircle2 className="h-10 w-10 text-success" />
          )}
        </div>

        <h2 className={cn(
          "text-xl font-semibold mb-2",
          workState === 'working' ? 'text-foreground' : 'text-success'
        )}>
          {getTitle()}
        </h2>

        <p className="text-foreground-secondary mb-6">
          {getSubtitle()}
        </p>

        {workState === 'working' && (
          <div className="mb-8">
            <p className="text-xs text-foreground-secondary mb-2 text-center">
              Tiempo trabajado
            </p>
            <div className="text-4xl sm:text-5xl font-light text-foreground tabular-nums tracking-tight">
              {elapsedTime}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <InlineEditField
            isEditing={editingClockIn}
            onEdit={() => canEdit && setEditingClockIn(true)}
            onCancel={handleCancel}
            onSave={handleSave}
            editLabel="Editar hora de entrada"
            showEditButton={!isNewRecord}
            viewContent={
              <div className={cn(
                "text-center p-4 bg-background rounded-xl border transition-colors",
                canEdit && "group-hover:border-success/30 cursor-pointer"
              )}>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide mb-1">
                  Entrada
                </p>
                <p className={cn(
                  "text-lg font-semibold tabular-nums transition-colors",
                  canEdit && "group-hover:text-success"
                )}>
                  {displayClockIn}
                </p>
                {canEdit && !isNewRecord && (
                  <p className="text-[10px] text-foreground-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click para editar
                  </p>
                )}
              </div>
            }
            editContent={
              <div className="space-y-2">
                <TimeInput
                  value={editClockInValue}
                  onChange={setEditClockInValue}
                  label="Hora de entrada"
                  autoFocus
                />
              </div>
            }
          />

          <InlineEditField
            isEditing={editingClockOut}
            onEdit={() => canEdit && setEditingClockOut(true)}
            onCancel={handleCancel}
            onSave={handleSave}
            editLabel="Editar hora de salida"
            showEditButton={!isNewRecord}
            viewContent={
              <div className={cn(
                "text-center p-4 bg-background rounded-xl border transition-colors",
                canEdit && "group-hover:border-success/30 cursor-pointer"
              )}>
                <p className="text-xs text-foreground-secondary uppercase tracking-wide mb-1">
                  Salida
                </p>
                <p className={cn(
                  "text-lg font-semibold tabular-nums transition-colors",
                  canEdit && "group-hover:text-success"
                )}>
                  {displayClockOut}
                </p>
                {canEdit && !isNewRecord && (
                  <p className="text-[10px] text-foreground-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click para editar
                  </p>
                )}
              </div>
            }
            editContent={
              <div className="space-y-2">
                <TimeInput
                  value={editClockOutValue}
                  onChange={setEditClockOutValue}
                  label="Hora de salida"
                  autoFocus
                />
              </div>
            }
          />
        </div>

        {isEditingAny && (
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={Boolean(isSaving || isClockInBeforeClockOut || (!editClockInValue && !editClockOutValue))}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Guardando...
                </>
              ) : (
                isNewRecord ? 'Crear registro' : 'Guardar'
              )}
            </Button>
          </div>
        )}

        {isClockInBeforeClockOut && isEditingAny && (
          <p className="text-xs text-error mb-4">
            La entrada debe ser anterior a la salida
          </p>
        )}

        {(actionLoading === 'update' || actionLoading === 'create' || actionLoading === 'delete' || isSaving) && !isEditingAny && (
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-foreground-secondary">
            <Spinner size="sm" />
            {actionLoading === 'create' ? 'Creando registro...' : actionLoading === 'delete' ? 'Eliminando...' : 'Guardando cambios...'}
          </div>
        )}

        {!isNewRecord && workState !== 'working' && (
          <div className="p-5 bg-background rounded-xl mb-4 border border-border-subtle">
            <p className="text-sm text-foreground-secondary mb-1">Total de hoy</p>
            <p className="text-4xl font-bold text-success tabular-nums">
              {totalHours?.toFixed(1) || '0.0'}h
            </p>
          </div>
        )}

        {workState === 'completed' && onDelete && (
          <Button
            variant="ghost"
            onClick={onDelete}
            disabled={actionLoading === 'delete'}
            className="text-error hover:text-error hover:bg-error/10 w-full mb-4"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {actionLoading === 'delete' ? 'Eliminando...' : 'Eliminar registro de hoy'}
          </Button>
        )}

        {workState === 'working' && (
          <Button
            onClick={onClockOut}
            disabled={actionLoading === 'clock_out'}
            size="lg"
            className="w-full h-16 text-lg bg-background border-2 border-foreground/20 text-foreground hover:bg-background-secondary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Terminar jornada"
          >
            {actionLoading === 'clock_out' ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Registrando...
              </>
            ) : (
              <>
                <LogOut className="h-6 w-6 mr-2" />
                Terminar jornada
              </>
            )}
          </Button>
        )}

        {isNewRecord && !isEditingAny && (
          <p className="text-sm text-foreground-secondary">
            Click en un campo para editar
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default ClockInCard
