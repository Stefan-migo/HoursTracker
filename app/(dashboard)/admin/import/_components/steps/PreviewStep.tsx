'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, Check, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { UseImportWizardReturn } from '@/lib/hooks/useImportWizard'
import type { PreviewRecord } from '@/lib/import/types'

interface PreviewStepProps {
  wizard: UseImportWizardReturn
}

export function PreviewStep({ wizard }: PreviewStepProps) {
  const { state, setPreviewRecords, setNewWorkers, setLoading } = wizard
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Generate preview records from file data and mapping
  useEffect(() => {
    if (!state.fileData || state.previewRecords.length > 0) return

    const generatePreview = async () => {
      setLoading(true)
      
      try {
        const fileData = state.fileData!
        // Get mapping lookups
        const emailColumn = state.columnMapping.find(m => m.targetField === 'email')?.sourceColumn
        const dateColumn = state.columnMapping.find(m => m.targetField === 'date')?.sourceColumn
        const clockInColumn = state.columnMapping.find(m => m.targetField === 'clockIn')?.sourceColumn
        const clockOutColumn = state.columnMapping.find(m => m.targetField === 'clockOut')?.sourceColumn

        const records: PreviewRecord[] = fileData.rows.slice(0, 100).map((row: Record<string, string>, index: number) => {
          const errors: PreviewRecord['errors'] = []
          
          // Validate email
          const email = emailColumn ? row[emailColumn] : ''
          if (!email || !email.includes('@')) {
            errors.push({ row: index + 2, field: 'email', message: 'Email inválido' })
          }

          // Validate date
          const date = dateColumn ? row[dateColumn] : ''
          if (!date) {
            errors.push({ row: index + 2, field: 'date', message: 'Fecha requerida' })
          }

          // Validate clock in
          const clockIn = clockInColumn ? row[clockInColumn] : ''
          if (!clockIn) {
            errors.push({ row: index + 2, field: 'clockIn', message: 'Hora entrada requerida' })
          }

          // Validate clock out
          const clockOut = clockOutColumn ? row[clockOutColumn] : ''
          if (!clockOut) {
            errors.push({ row: index + 2, field: 'clockOut', message: 'Hora salida requerida' })
          }

          return {
            row: index + 2,
            data: {
              email: email || '',
              date: date || '',
              clockIn: clockIn || '',
              clockOut: clockOut || ''
            },
            errors,
            isValid: errors.length === 0
          }
        })

        setPreviewRecords(records)

        // Detect new employees
        const emails = [...new Set(records.map(r => r.data.email).filter(Boolean))]
        const newEmps = emails.map(email => ({
          email,
          fullName: '',
          rowNumbers: records.filter(r => r.data.email === email).map(r => r.row),
          createProfile: true,
          sendInvitation: false
        }))

        setNewWorkers(newEmps)
      } catch (error) {
        console.error('Error generating preview:', error)
      } finally {
        setLoading(false)
      }
    }

    generatePreview()
  }, [state.fileData, state.columnMapping])

  const filteredRecords = useMemo(() => {
    let records = state.previewRecords

    if (filter === 'valid') {
      records = records.filter(r => r.isValid)
    } else if (filter === 'invalid') {
      records = records.filter(r => !r.isValid)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      records = records.filter(r => 
        r.data.email.toLowerCase().includes(term) ||
        r.data.date.toLowerCase().includes(term)
      )
    }

    return records
  }, [state.previewRecords, filter, searchTerm])

  const stats = useMemo(() => ({
    total: state.previewRecords.length,
    valid: state.previewRecords.filter(r => r.isValid).length,
    invalid: state.previewRecords.filter(r => !r.isValid).length
  }), [state.previewRecords])

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-background border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold">{stats.total}</div>
            <div className="text-xs text-foreground-secondary">Total registros</div>
          </CardContent>
        </Card>
        <Card className="bg-background border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-success">{stats.valid}</div>
            <div className="text-xs text-foreground-secondary">Válidos</div>
          </CardContent>
        </Card>
        <Card className="bg-background border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-semibold text-error">{stats.invalid}</div>
            <div className="text-xs text-foreground-secondary">Con errores</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          {(['all', 'valid', 'invalid'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                ${filter === f 
                  ? 'bg-accent text-white' 
                  : 'bg-background-secondary text-foreground-secondary hover:bg-background-tertiary'
                }
              `}
            >
              {f === 'all' ? 'Todos' : f === 'valid' ? 'Válidos' : 'Con errores'}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground-secondary" />
          <Input
            placeholder="Buscar por email o fecha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Preview Table */}
      <Card className="bg-background border-border overflow-hidden">
        <div className="overflow-x-auto max-h-[400px]">
          <table className="w-full">
            <thead className="sticky top-0 bg-background border-b border-border z-10">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary w-10">Estado</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">Fila</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">Fecha</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">Entrada</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-foreground-secondary">Salida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-foreground-secondary">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr 
                    key={record.row}
                    className={`
                      hover:bg-background-secondary/30 transition-colors
                      ${!record.isValid ? 'bg-error-muted/30' : ''}
                    `}
                  >
                    <td className="py-3 px-4">
                      {record.isValid ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-error" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-foreground-secondary">{record.row}</td>
                    <td className="py-3 px-4 text-sm">{record.data.email}</td>
                    <td className="py-3 px-4 text-sm">{record.data.date}</td>
                    <td className="py-3 px-4 text-sm">{record.data.clockIn}</td>
                    <td className="py-3 px-4 text-sm">{record.data.clockOut}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {state.fileData && state.fileData.totalRows > 100 && (
          <div className="p-3 border-t border-border-subtle text-center text-sm text-foreground-secondary">
            Mostrando primeros 100 registros de {state.fileData.totalRows} totales
          </div>
        )}
      </Card>

      {stats.invalid > 0 && (
        <div className="p-4 bg-error-muted border border-error/20 rounded-lg">
          <p className="text-sm text-error">
            <strong>Hay {stats.invalid} registros con errores</strong>
          </p>
          <p className="text-sm text-error/80 mt-1">
            Los registros con errores no serán importados. Puedes corregir el archivo original y volver a subirlo, 
            o continuar importando solo los registros válidos.
          </p>
        </div>
      )}
    </div>
  )
}
