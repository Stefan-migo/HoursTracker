'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Check, ChevronLeft, ChevronRight, LayoutGrid, Table2 } from 'lucide-react'
import { FormatDetector } from '@/lib/detectors/FormatDetector'
import { DataTransformer } from '@/lib/transformers/DataTransformer'
import type { TransformedRecord, FormatDetectionResult } from '@/lib/transformers/types'

interface TransformStepProps {
  headers: string[]
  rows: Record<string, string>[]
  onTransformComplete: (records: TransformedRecord[]) => void
  onBack: () => void
}

export function TransformStep({ headers, rows, onTransformComplete, onBack }: TransformStepProps) {
  const [format, setFormat] = useState<FormatDetectionResult | null>(null)
  const [transformedRecords, setTransformedRecords] = useState<TransformedRecord[]>([])
  const [isManualOverride, setIsManualOverride] = useState(false)
  const [manualFormat, setManualFormat] = useState<'horizontal' | 'vertical'>('horizontal')
  const [currentPage, setCurrentPage] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Detectar formato automáticamente al cargar - usando requestAnimationFrame
  useEffect(() => {
    const detectAndTransform = () => {
      const detected = FormatDetector.detect(headers)
      setFormat(detected)

      // Si la confianza es alta, transformar
      if (detected.confidence > 0.7 && detected.type !== 'unknown') {
        try {
          const records = DataTransformer.transform(headers, rows, detected)
          setTransformedRecords(records)
        } catch (err) {
          console.error('Error transforming:', err)
        }
      }
    }

    // Usar requestAnimationFrame para evitar setState síncrono
    requestAnimationFrame(detectAndTransform)
  }, [headers, rows])

  // Transformar cuando cambia el formato manual
  useEffect(() => {
    if (!isManualOverride || !format) return

    const transformWithManualFormat = () => {
      const manualFormatResult: FormatDetectionResult = {
        ...format,
        type: manualFormat,
        confidence: 1
      }
      
      try {
        const records = DataTransformer.transform(headers, rows, manualFormatResult)
        setTransformedRecords(records)
      } catch (err) {
        console.error('Error transforming:', err)
      }
    }

    requestAnimationFrame(transformWithManualFormat)
  }, [isManualOverride, manualFormat, headers, rows, format])

  const stats = useMemo(() => {
    if (transformedRecords.length === 0) return null
    
    const total = transformedRecords.length
    const valid = transformedRecords.filter(r => r.isValid).length
    const invalid = total - valid
    const skippedByInvalidHours = transformedRecords.filter(r => !r.clockIn || !r.clockOut).length
    const uniqueEmployees = new Set(transformedRecords.map(r => r.email).filter(Boolean)).size
    const uniqueDates = new Set(transformedRecords.map(r => r.date).filter(Boolean)).size

    return {
      total,
      valid,
      invalid,
      skippedByInvalidHours,
      uniqueEmployees,
      uniqueDates
    }
  }, [transformedRecords])

  const getConfidenceColor = useCallback((confidence: number) => {
    if (confidence >= 0.9) return 'bg-success'
    if (confidence >= 0.7) return 'bg-warning'
    return 'bg-error'
  }, [])

  const getConfidenceLabel = useCallback((confidence: number) => {
    if (confidence >= 0.9) return 'Alta'
    if (confidence >= 0.7) return 'Media'
    return 'Baja'
  }, [])

  const handleConfirm = useCallback(() => {
    setIsProcessing(true)
    onTransformComplete(transformedRecords)
  }, [onTransformComplete, transformedRecords])

  const previewRecords = transformedRecords.slice(currentPage * 10, (currentPage + 1) * 10)
  const totalPages = Math.ceil(transformedRecords.length / 10)

  return (
    <div className="space-y-6">
      {/* Detección de Formato */}
      {format && (
        <Card className={`border-l-4 ${format.confidence >= 0.7 ? 'border-l-success' : format.confidence >= 0.5 ? 'border-l-warning' : 'border-l-error'}`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">Formato Detectado</h3>
                  <Badge className={getConfidenceColor(format.confidence)}>
                    Confianza: {getConfidenceLabel(format.confidence)}
                  </Badge>
                </div>
                
                <p className="text-foreground-secondary">
                  {format.type === 'horizontal' ? (
                    <span className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      Horizontal - Fechas en columnas
                    </span>
                  ) : format.type === 'vertical' ? (
                    <span className="flex items-center gap-2">
                      <Table2 className="h-4 w-4" />
                      Vertical - Fechas en filas
                    </span>
                  ) : (
                    'No se pudo detectar el formato'
                  )}
                </p>

                {format.message && (
                  <p className="text-sm text-accent">{format.message}</p>
                )}

                {format.dateColumns && (
                  <p className="text-sm text-foreground-secondary">
                    {format.dateColumns.length} días laborables detectados
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManualOverride(!isManualOverride)}
              >
                {isManualOverride ? 'Usar detección automática' : 'Corregir manualmente'}
              </Button>
            </div>

            {/* Override Manual */}
            {isManualOverride && (
              <div className="mt-4 p-4 bg-background-secondary rounded-lg">
                <p className="text-sm font-medium mb-3">Selecciona el formato correcto:</p>
                <div className="flex gap-3">
                  <Button
                    variant={manualFormat === 'horizontal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setManualFormat('horizontal')}
                    className="flex items-center gap-2"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Horizontal
                    <span className="text-xs opacity-70 block">Fechas en columnas</span>
                  </Button>
                  <Button
                    variant={manualFormat === 'vertical' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setManualFormat('vertical')}
                    className="flex items-center gap-2"
                  >
                    <Table2 className="h-4 w-4" />
                    Vertical
                    <span className="text-xs opacity-70 block">Fechas en filas</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estadísticas de Transformación */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado de la Transformación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 bg-background-secondary rounded-lg text-center">
                <div className="text-2xl font-semibold">{stats.total}</div>
                <div className="text-xs text-foreground-secondary">Registros totales</div>
              </div>
              <div className="p-4 bg-success-muted rounded-lg text-center">
                <div className="text-2xl font-semibold text-success">{stats.valid}</div>
                <div className="text-xs text-foreground-secondary">Válidos</div>
              </div>
              <div className="p-4 bg-error-muted rounded-lg text-center">
                <div className="text-2xl font-semibold text-error">{stats.invalid}</div>
                <div className="text-xs text-foreground-secondary">Con errores</div>
              </div>
              <div className="p-4 bg-background-secondary rounded-lg text-center">
                <div className="text-2xl font-semibold text-foreground-secondary">{stats.skippedByInvalidHours}</div>
                <div className="text-xs text-foreground-secondary">Ignorados (Libre, etc.)</div>
              </div>
              <div className="p-4 bg-background-secondary rounded-lg text-center">
                <div className="text-2xl font-semibold text-accent">{stats.uniqueEmployees}</div>
                  <div className="text-xs text-foreground-secondary">Trabajadores</div>
              </div>
              <div className="p-4 bg-background-secondary rounded-lg text-center">
                <div className="text-2xl font-semibold text-accent">{stats.uniqueDates}</div>
                <div className="text-xs text-foreground-secondary">Días</div>
              </div>
            </div>

            {stats.skippedByInvalidHours > 0 && (
              <div className="mt-4 p-3 bg-warning-muted border border-warning/20 rounded-lg">
                <p className="text-sm text-warning">
                  <strong>Nota:</strong> Se ignoraron {stats.skippedByInvalidHours} registros con valores como 
                  &quot;Libre&quot;, &quot;Feriado&quot;, &quot;Vacaciones&quot; o sin horas válidas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview de Datos Transformados */}
      {transformedRecords.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Vista Previa de Datos Transformados</CardTitle>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-foreground-secondary">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle bg-background-secondary/50">
                    <th className="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Estado</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Trabajador</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-foreground-secondary hidden sm:table-cell">Email</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Fecha</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Entrada</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-foreground-secondary">Salida</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-foreground-secondary hidden md:table-cell">Errores</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {previewRecords.map((record, idx) => (
                    <tr 
                      key={idx}
                      className={`${!record.isValid ? 'bg-error-muted/30' : ''} hover:bg-background-secondary/30`}
                    >
                      <td className="py-2 px-3">
                        {record.isValid ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-error" />
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm font-medium">{record.fullName || '-'}</td>
                      <td className="py-2 px-3 text-sm text-foreground-secondary hidden sm:table-cell">
                        {record.email || <span className="italic">Sin email</span>}
                      </td>
                      <td className="py-2 px-3 text-sm">{record.date}</td>
                      <td className="py-2 px-3 text-sm">{record.clockIn || '-'}</td>
                      <td className="py-2 px-3 text-sm">{record.clockOut || '-'}</td>
                      <td className="py-2 px-3 text-sm text-error hidden md:table-cell">
                        {record.errors.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navegación */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <Button 
          onClick={handleConfirm}
          disabled={transformedRecords.length === 0 || isProcessing}
        >
          {isProcessing ? 'Procesando...' : 'Confirmar Transformación'}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
