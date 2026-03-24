'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TARGET_FIELDS } from '@/lib/import/types'
import { ColumnDetector } from '@/lib/detectors/ColumnDetector'
import type { UseImportWizardReturn } from '@/lib/hooks/useImportWizard'

interface MappingStepProps {
  wizard: UseImportWizardReturn
}

export function MappingStep({ wizard }: MappingStepProps) {
  const { state, updateColumnMapping } = wizard

  const requiredFieldsMapped = useMemo(() => {
    return ColumnDetector.areAllRequiredFieldsMapped(state.columnMapping)
  }, [state.columnMapping])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-success'
    if (confidence >= 0.7) return 'bg-warning'
    if (confidence > 0) return 'bg-error'
    return 'bg-border'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Alta'
    if (confidence >= 0.7) return 'Media'
    if (confidence > 0) return 'Baja'
    return 'Sin mapear'
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 bg-accent-muted border border-accent/20 rounded-lg">
        <p className="text-sm text-accent">
          <strong>Mapeo de columnas detectado</strong>
        </p>
        <p className="text-sm text-accent/80 mt-1">
          Hemos detectado automáticamente el mapeo de columnas. 
          Revisa y corrige si es necesario antes de continuar.
        </p>
      </div>

      {/* Required Fields Status */}
      <div className="flex flex-wrap gap-2">
        {TARGET_FIELDS.filter(f => f.required).map(field => {
          const isMapped = state.columnMapping.some(m => m.targetField === field.id && m.confidence >= 0.5)
          return (
            <Badge 
              key={field.id}
              variant={isMapped ? 'success' : 'destructive'}
              className="text-xs"
            >
              {isMapped ? '✓' : '✗'} {field.label} {field.required && '(obligatorio)'}
            </Badge>
          )
        })}
      </div>

      {/* Mapping Grid */}
      <Card className="bg-background border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-secondary border-b border-border">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">Columna del archivo</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">Mapear a</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">Confianza</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">Muestra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {state.columnMapping.map((mapping) => (
                <tr 
                  key={mapping.sourceColumn}
                  className={`
                    hover:bg-background-secondary/50 transition-colors
                    ${mapping.targetField && mapping.confidence >= 0.5 ? 'border-l-4 border-l-success' : ''}
                    ${mapping.targetField && mapping.confidence < 0.5 ? 'border-l-4 border-l-warning' : ''}
                    ${!mapping.targetField ? 'border-l-4 border-l-border' : ''}
                  `}
                >
                  <td className="py-3 px-4">
                    <span className="font-medium">{mapping.sourceColumn}</span>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={mapping.targetField || ''}
                      onChange={(e) => updateColumnMapping(mapping.sourceColumn, e.target.value || null)}
                      className="w-full h-9 px-3 border border-border rounded-md bg-background text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                    >
                      <option value="">-- Sin mapear --</option>
                      <optgroup label="Campos obligatorios">
                        {TARGET_FIELDS.filter(f => f.required).map(field => (
                          <option key={field.id} value={field.id}>{field.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Campos opcionales">
                        {TARGET_FIELDS.filter(f => !f.required).map(field => (
                          <option key={field.id} value={field.id}>{field.label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    {mapping.targetField ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-16 h-2 rounded-full ${getConfidenceColor(mapping.confidence)}`} />
                        <span className="text-xs text-foreground-secondary">
                          {getConfidenceLabel(mapping.confidence)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-foreground-secondary">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-xs text-foreground-secondary truncate max-w-[150px]">
                      {mapping.sampleValues.slice(0, 3).join(', ')}
                      {mapping.sampleValues.length > 3 && '...'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Validation Message */}
      {!requiredFieldsMapped && (
        <div className="p-4 bg-warning-muted border border-warning/20 rounded-lg">
          <p className="text-sm text-warning">
            <strong>Campos obligatorios pendientes</strong>
          </p>
          <p className="text-sm text-warning/80 mt-1">
            Por favor, mapea todos los campos obligatorios (Email, Fecha, Hora Entrada, Hora Salida) antes de continuar.
          </p>
        </div>
      )}
    </div>
  )
}
