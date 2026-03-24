'use client'

import React, { useState, useEffect, useMemo, useSyncExternalStore, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { LogIn, LogOut, Clock, CheckCircle2, Edit3 } from 'lucide-react'
import { formatTime, formatElapsedTime, cn } from '@/lib/utils'
import { useMessageContext } from '@/hooks/use-message-context'
import type { WorkState } from '@/lib/messages/types'
import { TimeInput } from './time-input'
import { InlineEditField } from './inline-edit-field'

interface ClockInCardProps {
  clockIn: string | null
  clockOut: string | null
  totalHours: number | null
  userName?: string | null
  isLoading: boolean
  actionLoading: 'clock_in' | 'clock_out' | 'update' | null
  onClockIn: () => void
  onClockOut: () => void
  onUpdateManual?: (data: { clockIn?: string; clockOut?: string }) => Promise<boolean>
  canEdit?: boolean
}

// Store externo para el cronómetro
let elapsedTimeStore = {
  time: '00:00:00',
  listeners: new Set<() => void>(),
  interval: null as NodeJS.Timeout | null,
  clockIn: null as string | null,
}

function subscribeToTimer(callback: () => void) {
  elapsedTimeStore.listeners.add(callback)
  return () => {
    elapsedTimeStore.listeners.delete(callback)
  }
}

function getTimerSnapshot() {
  return elapsedTimeStore.time
}

function updateTimerTime(time: string) {
  elapsedTimeStore.time = time
  elapsedTimeStore.listeners.forEach((cb) => cb())
}

// Hook personalizado para el cronómetro usando useSyncExternalStore
function useElapsedTimer(clockIn: string | null, isWorking: boolean) {
  const elapsedTime = useSyncExternalStore(
    subscribeToTimer,
    getTimerSnapshot,
    () => '00:00:00'
  )

  useEffect(() => {
    // Limpiar intervalo existente
    if (elapsedTimeStore.interval) {
      clearInterval(elapsedTimeStore.interval)
      elapsedTimeStore.interval = null
    }

    if (!isWorking || !clockIn) {
      updateTimerTime('00:00:00')
      elapsedTimeStore.clockIn = null
      return
    }

    // Guardar referencia al clockIn
    elapsedTimeStore.clockIn = clockIn

    // Función de actualización
    const tick = () => {
      if (elapsedTimeStore.clockIn) {
        updateTimerTime(formatElapsedTime(elapsedTimeStore.clockIn))
      }
    }

    // Ejecutar inmediatamente y configurar intervalo
    tick()
    elapsedTimeStore.interval = setInterval(tick, 1000)

    return () => {
      if (elapsedTimeStore.interval) {
        clearInterval(elapsedTimeStore.interval)
        elapsedTimeStore.interval = null
      }
    }
  }, [isWorking, clockIn])

  return elapsedTime
}

// Convierte timestamp ISO a formato HH:MM
function formatTimeForInput(isoString: string | null): string | null {
  if (!isoString) return null
  const date = new Date(isoString)
  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Convierte HH:MM a timestamp ISO para hoy
function parseTimeToISO(timeString: string | null): string | null {
  if (!timeString) return null
  const [hours, minutes] = timeString.split(':').map(Number)
  const now = new Date()
  now.setHours(hours, minutes, 0, 0)
  return now.toISOString()
}

export function ClockInCard({
  clockIn,
  clockOut,
  totalHours,
  userName,
  isLoading,
  actionLoading,
  onClockIn,
  onClockOut,
  onUpdateManual,
  canEdit = false,
}: ClockInCardProps) {
  const hasCheckedIn = !!clockIn
  const hasCheckedOut = !!clockOut
  const isWorking = hasCheckedIn && !hasCheckedOut

  // Determinar el estado de trabajo
  const workState: WorkState = useMemo(() => {
    if (!hasCheckedIn) return 'pending'
    if (isWorking) return 'working'
    return 'completed'
  }, [hasCheckedIn, isWorking])

  // Usar hook personalizado para el cronómetro
  const elapsedTime = useElapsedTimer(clockIn, isWorking)

  // Hook para mensajes contextuales
  const { title, subtitle, buttonText } = useMessageContext({
    state: workState,
    clockIn,
    clockOut,
    totalHours,
    elapsedTime,
    userName,
  })

  // Estados para edición de tiempos (solo en estado completed)
  const [editingClockIn, setEditingClockIn] = useState(false)
  const [editingClockOut, setEditingClockOut] = useState(false)
  const [editClockInValue, setEditClockInValue] = useState<string | null>(null)
  const [editClockOutValue, setEditClockOutValue] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Inicializar valores de edición
  useEffect(() => {
    setEditClockInValue(formatTimeForInput(clockIn))
    setEditClockOutValue(formatTimeForInput(clockOut))
  }, [clockIn, clockOut])

  // Si es un registro nuevo, inicializar en modo edición solo una vez
  const isNewRecord = !clockIn && !clockOut
  const hasInitializedRef = React.useRef(false)
  useEffect(() => {
    if (isNewRecord && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      setEditingClockIn(true)
      setEditingClockOut(true)
    }
  }, [isNewRecord])

  // Handler para guardar cambios
  const handleSave = useCallback(async () => {
    if (!onUpdateManual) return

    setIsSaving(true)
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

    if (Object.keys(data).length > 0) {
      const success = await onUpdateManual(data)
      if (success) {
        setEditingClockIn(false)
        setEditingClockOut(false)
      }
    } else {
      setEditingClockIn(false)
      setEditingClockOut(false)
    }

    setIsSaving(false)
  }, [editingClockIn, editingClockOut, editClockInValue, editClockOutValue, onUpdateManual, clockIn, clockOut])

  // Handler para cancelar edición
  const handleCancel = useCallback(() => {
    const isNewRecord = !clockIn && !clockOut
    // Si es registro nuevo, no cerrar los campos al hacer click outside
    // solo resetear los valores
    if (!isNewRecord) {
      setEditingClockIn(false)
      setEditingClockOut(false)
    }
    setEditClockInValue(formatTimeForInput(clockIn))
    setEditClockOutValue(formatTimeForInput(clockOut))
  }, [clockIn, clockOut])

  // Skeleton loader
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

  // ============================================================================
  // ESTADO 1 & 3: PENDING/COMPLETED - Mostrar inputs editables directamente
  // ============================================================================
  if (workState === 'pending' || workState === 'completed') {
    const displayClockIn = formatTimeForInput(clockIn) || ''
    const displayClockOut = formatTimeForInput(clockOut) || ''
    const isEditingAny = editingClockIn || editingClockOut

    return (
      <Card className={`rounded-2xl overflow-hidden ${
        isNewRecord 
          ? 'bg-background border-2 border-dashed border-border-subtle' 
          : 'bg-success-muted/50 border border-success/30'
      }`}>
        <CardContent className="p-6 sm:p-8 text-center">
          {/* Icono */}
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
            isNewRecord === true ? 'bg-accent-muted' : 'bg-success/20'
          }`}>
            {isNewRecord === true ? (
              <LogIn className="h-10 w-10 text-accent" />
            ) : (
              <CheckCircle2 className="h-10 w-10 text-success" />
            )}
          </div>

          {/* Título contextual */}
          <h2 className={`text-xl font-semibold mb-6 ${
            isNewRecord ? 'text-foreground' : 'text-success'
          }`}>
            {isNewRecord ? 'Registra tu jornada de hoy' : title}
          </h2>

          {/* Botón para editar ambos (solo visible cuando no se está editando y no es nuevo registro) */}
          {canEdit && !isEditingAny && !isNewRecord && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingClockIn(true)
                setEditingClockOut(true)
              }}
              className="mb-4 text-foreground-secondary hover:text-foreground"
            >
              <Edit3 className="h-4 w-4 mr-1" />
              Editar ambas horas
            </Button>
          )}

          {/* Grid de tiempos editable */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Entrada editable */}
            <InlineEditField
              isEditing={editingClockIn}
              onEdit={() => canEdit && setEditingClockIn(true)}
              onCancel={handleCancel}
              onSave={handleSave}
              editLabel="Editar hora de entrada"
              showEditButton={!isNewRecord}
              hideControls={isNewRecord}
              viewContent={
                <div className={`text-center p-4 bg-background rounded-xl border border-border-subtle transition-colors ${
                  canEdit && "group-hover:border-accent/30"
                }`}>
                  <p className="text-xs text-foreground-secondary uppercase tracking-wide mb-1">
                    Entrada
                  </p>
                  <p className={cn(
                    "text-lg font-semibold tabular-nums transition-colors",
                    canEdit && "group-hover:text-accent"
                  )}>
                    {displayClockIn || '--:--'}
                  </p>
                  {canEdit && !isNewRecord && (
                    <p className="text-[10px] text-foreground-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click para editar
                    </p>
                  )}
                </div>
              }
              editContent={
                <div className="space-y-3">
                  <TimeInput
                    value={editClockInValue}
                    onChange={setEditClockInValue}
                    label="Hora de entrada"
                    autoFocus
                  />
                  {editClockInValue && editClockOutValue && editClockInValue >= editClockOutValue && (
                    <p className="text-xs text-error">
                      La entrada debe ser anterior a la salida
                    </p>
                  )}
                </div>
              }
            />

            {/* Salida editable */}
            <InlineEditField
              isEditing={editingClockOut}
              onEdit={() => canEdit && setEditingClockOut(true)}
              onCancel={handleCancel}
              onSave={handleSave}
              editLabel="Editar hora de salida"
              showEditButton={!isNewRecord}
              hideControls={isNewRecord}
              viewContent={
                <div className={`text-center p-4 bg-background rounded-xl border border-border-subtle transition-colors ${
                  canEdit && "group-hover:border-accent/30"
                }`}>
                  <p className="text-xs text-foreground-secondary uppercase tracking-wide mb-1">
                    Salida
                  </p>
                  <p className={cn(
                    "text-lg font-semibold tabular-nums transition-colors",
                    canEdit && "group-hover:text-accent"
                  )}>
                    {displayClockOut || '--:--'}
                  </p>
                  {canEdit && !isNewRecord && (
                    <p className="text-[10px] text-foreground-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click para editar
                    </p>
                  )}
                </div>
              }
              editContent={
                <div className="space-y-3">
                  <TimeInput
                    value={editClockOutValue}
                    onChange={setEditClockOutValue}
                    label="Hora de salida"
                    autoFocus
                  />
                  {editClockInValue && editClockOutValue && editClockInValue >= editClockOutValue && (
                    <p className="text-xs text-error">
                      La salida debe ser posterior a la entrada
                    </p>
                  )}
                </div>
              }
            />
          </div>

          {/* Botón de guardar (visible cuando se está editando) */}
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
                disabled={Boolean(isSaving || !editClockInValue || !editClockOutValue || (editClockInValue && editClockOutValue && editClockInValue >= editClockOutValue))}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </div>
          )}

          {/* Indicador de guardado */}
          {(actionLoading === 'update' || isSaving) && (
            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-foreground-secondary">
              <Spinner size="sm" />
              Guardando cambios...
            </div>
          )}

          {/* Total de horas (solo si hay registro) */}
          {!isNewRecord && (
            <div className="p-5 bg-background rounded-xl mb-4 border border-border-subtle">
              <p className="text-sm text-foreground-secondary mb-1">Total de hoy</p>
              <p className="text-4xl font-bold text-success tabular-nums">
                {totalHours?.toFixed(1) || '0.0'}h
              </p>
            </div>
          )}

          {/* Mensaje */}
          <p className="text-sm text-foreground-secondary">
            {isNewRecord ? 'Ingresa la hora de entrada y salida de tu jornada' : subtitle}
          </p>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // ESTADO 2: WORKING (En jornada)
  // ============================================================================
  if (workState === 'working') {
    return (
      <Card className="bg-accent-muted/30 border border-accent/20 rounded-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8 text-center">
          {/* Icono pulsante */}
          <div className="w-20 h-20 mx-auto mb-6 bg-accent/20 rounded-full flex items-center justify-center">
            <Clock className="h-10 w-10 text-accent animate-pulse" />
          </div>

          {/* Título contextual */}
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {title}
          </h2>

          {/* Subtítulo con hora de entrada */}
          <p className="text-foreground-secondary mb-2">
            {subtitle}
          </p>

          {/* Cronómetro */}
          <div className="text-4xl sm:text-5xl font-light text-foreground mb-8 tabular-nums tracking-tight">
            {elapsedTime}
          </div>

          {/* Botón de salida */}
          <Button
            onClick={onClockOut}
            disabled={actionLoading === 'clock_out'}
            size="lg"
            className="w-full h-16 text-lg bg-background border-2 border-foreground/20 text-foreground hover:bg-background-secondary transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            aria-label={buttonText}
          >
            {actionLoading === 'clock_out' ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Registrando...
              </>
            ) : (
              <>
                <LogOut className="h-6 w-6 mr-2" />
                {buttonText}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // ESTADO 3: COMPLETED (Jornada terminada) con edición
  // ============================================================================
  const displayClockIn = formatTimeForInput(clockIn) || '--:--'
  const displayClockOut = formatTimeForInput(clockOut) || '--:--'
  const isEditingAny = editingClockIn || editingClockOut

  return (
    <Card className="bg-success-muted/50 border border-success/30 rounded-2xl overflow-hidden">
      <CardContent className="p-6 sm:p-8 text-center">
        {/* Icono de éxito */}
        <div className="w-20 h-20 mx-auto mb-6 bg-success/20 rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>

        {/* Título contextual */}
        <h2 className="text-xl font-semibold text-success mb-6">
          {title}
        </h2>

        {/* Grid de tiempos editable */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Entrada editable */}
          <InlineEditField
            isEditing={editingClockIn}
            onEdit={() => canEdit && setEditingClockIn(true)}
            onCancel={handleCancel}
            onSave={handleSave}
            editLabel="Editar hora de entrada"
            viewContent={
              <div className="text-center p-4 bg-background rounded-xl border border-border-subtle group-hover:border-success/30 transition-colors">
                <p className="text-xs text-foreground-secondary uppercase tracking-wide mb-1">
                  Entrada
                </p>
                <p className={cn(
                  "text-lg font-semibold tabular-nums transition-colors",
                  canEdit && "group-hover:text-success"
                )}>
                  {displayClockIn}
                </p>
                {canEdit && (
                  <p className="text-[10px] text-foreground-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click para editar
                  </p>
                )}
              </div>
            }
            editContent={
              <div className="space-y-3">
                <TimeInput
                  value={editClockInValue}
                  onChange={setEditClockInValue}
                  label="Hora de entrada"
                  autoFocus
                />
                {editClockInValue && editClockOutValue && editClockInValue >= editClockOutValue && (
                  <p className="text-xs text-error">
                    La entrada debe ser anterior a la salida
                  </p>
                )}
              </div>
            }
          />

          {/* Salida editable */}
          <InlineEditField
            isEditing={editingClockOut}
            onEdit={() => canEdit && setEditingClockOut(true)}
            onCancel={handleCancel}
            onSave={handleSave}
            editLabel="Editar hora de salida"
            viewContent={
              <div className="text-center p-4 bg-background rounded-xl border border-border-subtle group-hover:border-success/30 transition-colors">
                <p className="text-xs text-foreground-secondary uppercase tracking-wide mb-1">
                  Salida
                </p>
                <p className={cn(
                  "text-lg font-semibold tabular-nums transition-colors",
                  canEdit && "group-hover:text-success"
                )}>
                  {displayClockOut}
                </p>
                {canEdit && (
                  <p className="text-[10px] text-foreground-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click para editar
                  </p>
                )}
              </div>
            }
            editContent={
              <div className="space-y-3">
                <TimeInput
                  value={editClockOutValue}
                  onChange={setEditClockOutValue}
                  label="Hora de salida"
                  autoFocus
                />
                {editClockInValue && editClockOutValue && editClockInValue >= editClockOutValue && (
                  <p className="text-xs text-error">
                    La salida debe ser posterior a la entrada
                  </p>
                )}
              </div>
            }
          />
        </div>

        {/* Botón de editar ambos (solo visible cuando no se está editando) */}
        {canEdit && !isEditingAny && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingClockIn(true)
              setEditingClockOut(true)
            }}
            className="mb-4 text-foreground-secondary hover:text-foreground"
          >
            <Edit3 className="h-4 w-4 mr-1" />
            Editar ambas horas
          </Button>
        )}

        {/* Indicador de guardado */}
        {(actionLoading === 'update' || isSaving) && (
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-foreground-secondary">
            <Spinner size="sm" />
            Guardando cambios...
          </div>
        )}

        {/* Total de horas */}
        <div className="p-5 bg-background rounded-xl mb-4 border border-border-subtle">
          <p className="text-sm text-foreground-secondary mb-1">Total de hoy</p>
          <p className="text-4xl font-bold text-success tabular-nums">
            {totalHours?.toFixed(1) || '0.0'}h
          </p>
        </div>

        {/* Mensaje de despedida */}
        <p className="text-sm text-foreground-secondary">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  )
}

export default ClockInCard
