'use client'

import * as React from 'react'
import { Clock, ChevronUp, ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface TimeInputProps {
  value: string | null
  onChange: (value: string) => void
  onBlur?: () => void
  onCancel?: () => void
  label?: string
  error?: string
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

/**
 * Input especializado para horas (HH:MM)
 * - Máscara automática de formato
 * - Validación visual en tiempo real
 * - Botones de incremento/decremento
 * - Icono de reloj
 */
export function TimeInput({
  value,
  onChange,
  onBlur,
  onCancel,
  label,
  error,
  disabled = false,
  className,
  autoFocus = false,
}: TimeInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = React.useState(value || '')
  const [isValid, setIsValid] = React.useState(true)

  // Actualizar valor local cuando cambia el prop externo
  React.useEffect(() => {
    setLocalValue(value || '')
  }, [value])

  // Auto-focus al montar si está habilitado
  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [autoFocus])

  // Validar formato de hora (HH:MM)
  const validateTime = (time: string): boolean => {
    if (!time) return true
    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    return regex.test(time)
  }

  // Formatear valor a HH:MM
  const formatTimeValue = (input: string): string => {
    // Remover caracteres no numéricos
    const numbers = input.replace(/\D/g, '')
    
    if (numbers.length === 0) return ''
    
    if (numbers.length <= 2) {
      return numbers
    }
    
    // Formatear como HH:MM
    const hours = numbers.slice(0, 2)
    const minutes = numbers.slice(2, 4)
    
    // Validar horas
    const hoursNum = parseInt(hours, 10)
    if (hoursNum > 23) {
      return `23:${minutes || '00'}`
    }
    
    // Validar minutos
    const minutesNum = parseInt(minutes, 10)
    if (minutesNum > 59) {
      return `${hours}:59`
    }
    
    return `${hours}:${minutes || '00'}`
  }

  // Manejar cambio en el input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const formatted = formatTimeValue(input)
    
    setLocalValue(formatted)
    setIsValid(validateTime(formatted))
    
    // Solo notificar cambio si es válido
    if (validateTime(formatted)) {
      onChange(formatted)
    }
  }

  // Manejar teclas especiales
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onCancel?.()
      return
    }
    
    if (e.key === 'Enter') {
      e.preventDefault()
      if (isValid) {
        onBlur?.()
      }
      return
    }
    
    // Navegación con flechas
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      adjustTime(e.key === 'ArrowUp' ? 1 : -1)
    }
  }

  // Ajustar tiempo (+/- 15 minutos)
  const adjustTime = (direction: 1 | -1) => {
    if (!localValue || !validateTime(localValue)) return
    
    const [hours, minutes] = localValue.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + direction * 15
    
    // Validar límites
    if (totalMinutes < 0 || totalMinutes >= 24 * 60) return
    
    const newHours = Math.floor(totalMinutes / 60)
    const newMinutes = totalMinutes % 60
    
    const formatted = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`
    setLocalValue(formatted)
    setIsValid(true)
    onChange(formatted)
  }

  // Manejar pérdida de foco
  const handleBlur = () => {
    // Completar formato si es parcial
    if (localValue && !localValue.includes(':')) {
      const padded = localValue.padStart(2, '0')
      const formatted = `${padded}:00`
      setLocalValue(formatted)
      onChange(formatted)
    }
    
    onBlur?.()
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      
      <div className="flex items-center gap-2">
        {/* Contenedor del input */}
        <div className={cn(
          'relative flex items-center flex-1',
          'rounded-md border transition-all duration-200',
          error || !isValid
            ? 'border-error focus-within:ring-2 focus-within:ring-error focus-within:ring-offset-2'
            : 'border-border focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2',
          'bg-background'
        )}>
          {/* Icono de reloj */}
          <Clock className={cn(
            'absolute left-3 h-4 w-4',
            error || !isValid ? 'text-error' : 'text-foreground-secondary'
          )} />
          
          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            placeholder="--:--"
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={disabled}
            className={cn(
              'flex-1 h-10 bg-transparent pl-10 pr-8',
              'text-sm font-medium tabular-nums',
              'placeholder:text-foreground-secondary',
              'focus:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error || !isValid ? 'text-error' : 'text-foreground'
            )}
            aria-label={label || 'Hora'}
            aria-invalid={!isValid || !!error}
          />
          
          {/* Indicador de validación */}
          {localValue && (
            <div className="absolute right-2">
              {isValid && !error ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <X className="h-4 w-4 text-error" />
              )}
            </div>
          )}
        </div>
        
        {/* Botones de ajuste (solo en desktop) */}
        <div className="hidden sm:flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-5 w-5"
            onClick={() => adjustTime(1)}
            disabled={disabled}
            aria-label="Aumentar 15 minutos"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-5 w-5"
            onClick={() => adjustTime(-1)}
            disabled={disabled}
            aria-label="Disminuir 15 minutos"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Mensaje de error */}
      {(error || (!isValid && localValue)) && (
        <p className="text-xs text-error">
          {error || 'Formato inválido (HH:MM)'}
        </p>
      )}
      
      {/* Hint */}
      {!error && isValid && (
        <p className="text-xs text-foreground-secondary">
          Formato: HH:MM (ej: 09:30)
        </p>
      )}
    </div>
  )
}

export default TimeInput
