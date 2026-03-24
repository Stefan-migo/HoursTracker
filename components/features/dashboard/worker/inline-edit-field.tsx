'use client'

import * as React from 'react'
import { Pencil, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface InlineEditFieldProps {
  isEditing: boolean
  viewContent: React.ReactNode
  editContent: React.ReactNode
  onEdit?: () => void
  onCancel?: () => void
  onSave?: () => void
  editLabel?: string
  className?: string
  showEditButton?: boolean
  hideControls?: boolean
}

/**
 * Wrapper que alterna entre modo vista y edición
 * con transiciones suaves y controles de acción
 */
export function InlineEditField({
  isEditing,
  viewContent,
  editContent,
  onEdit,
  onCancel,
  onSave,
  editLabel = 'Editar',
  className,
  showEditButton = true,
  hideControls = false,
}: InlineEditFieldProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Manejar click fuera para cancelar edición
  React.useEffect(() => {
    if (!isEditing) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onCancel?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing, onCancel])

  // Manejar tecla Escape para cancelar
  React.useEffect(() => {
    if (!isEditing) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel?.()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isEditing, onCancel])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative group transition-all duration-200',
        isEditing && 'z-10',
        className
      )}
    >
      {/* Modo Vista */}
      {!isEditing && (
        <div
          onClick={onEdit}
          className={cn(
            'relative cursor-pointer rounded-lg transition-all duration-200',
            'hover:bg-accent-muted/30',
            showEditButton && 'pr-8' // Espacio para botón de editar
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onEdit?.()
            }
          }}
          aria-label={`${editLabel}. Presiona Enter para editar.`}
        >
          {viewContent}
          
          {/* Botón de editar visible en hover/focus */}
          {showEditButton && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.()
              }}
              aria-label={editLabel}
            >
              <Pencil className="h-3 w-3 text-foreground-secondary" />
            </Button>
          )}
        </div>
      )}

      {/* Modo Edición */}
      {isEditing && (
        <div
          className={cn(
            'relative rounded-lg border-2 p-3',
            'bg-background border-accent shadow-lg',
            'animate-in fade-in zoom-in-95 duration-200'
          )}
        >
          {/* Contenido editable */}
          {editContent}
          
          {/* Controles de acción - solo mostrar si hideControls es false */}
          {!hideControls && (
            <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border-subtle">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onSave}
                className="h-8"
              >
                <Check className="h-4 w-4 mr-1" />
                Guardar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Variante simplificada para campos individuales
interface SimpleInlineEditProps {
  value: string | null
  displayValue: string
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  isEditing: boolean
  editContent: React.ReactNode
  label?: string
  className?: string
}

export function SimpleInlineEdit({
  value,
  displayValue,
  onEdit,
  onCancel,
  onSave,
  isEditing,
  editContent,
  label,
  className,
}: SimpleInlineEditProps) {
  return (
    <InlineEditField
      isEditing={isEditing}
      onEdit={onEdit}
      onCancel={onCancel}
      onSave={onSave}
      className={className}
      viewContent={
        <div className="p-3 text-center">
          {label && (
            <p className="text-xs text-foreground-secondary uppercase tracking-wide mb-1">
              {label}
            </p>
          )}
          <p className="text-lg font-semibold text-foreground tabular-nums">
            {displayValue}
          </p>
          <p className="text-[10px] text-foreground-secondary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Click para editar
          </p>
        </div>
      }
      editContent={editContent}
    />
  )
}

export default InlineEditField
