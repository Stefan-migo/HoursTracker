'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, AlertCircle, FileSpreadsheet, Users, Mail, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UseImportWizardReturn } from '@/lib/hooks/useImportWizard'

interface ConfirmStepProps {
  wizard: UseImportWizardReturn
}

export function ConfirmStep({ wizard }: ConfirmStepProps) {
  const { state, setImportResult, setLoading, setError } = wizard
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const router = useRouter()

  const validRecords = state.previewRecords.filter(r => r.isValid).length
  const employeesToCreate = state.newEmployees.filter(e => e.createProfile && e.fullName.trim()).length
  const invitationsToSend = state.newEmployees.filter(e => e.createProfile && e.sendInvitation && e.fullName.trim()).length

  const handleImport = async () => {
    setIsImporting(true)
    setLoading(true)
    setProgress(0)

    try {
      const validRecords = state.previewRecords.filter(r => r.isValid)
      const validEmployees = state.newEmployees.filter(e => e.createProfile && e.fullName.trim())
      
      console.log('🚀 Starting import:', {
        recordsCount: validRecords.length,
        employeesCount: validEmployees.length,
        sampleRecord: validRecords[0]
      })

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setProgress(i)
      }

      // Call import API
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: validRecords.map(r => ({
            email: r.data.email,
            date: r.data.date,
            clockIn: r.data.clockIn,
            clockOut: r.data.clockOut,
            row: r.row
          })),
          employees: validEmployees
        })
      })

      const result = await response.json()
      console.log('📥 API Response:', result)

      if (!response.ok || result.error) {
        console.error('❌ Import failed:', result)
        throw new Error(result.error || result.errors?.[0]?.error || 'Error al importar')
      }

      console.log('✅ Import result:', result)
      
      // Show debug info in console
      if (result.debug) {
        console.log('🔍 Debug Details:')
        console.log('- Total valid records:', result.debug.totalValidRecords)
        console.log('- Profiles found:', result.debug.profilesFound)
        console.log('- Unique emails:', result.debug.uniqueEmails)
        console.log('- Emails list:', result.debug.emailsList)
        console.log('- Profile emails:', result.debug.profileEmails)
        console.log('- Missing emails:', result.debug.missingEmails)
        console.log('- Records with profile:', result.debug.recordsWithProfile)
        console.log('- Records without profile:', result.debug.recordsWithoutProfile)
        console.log('- Duplicate records:', result.debug.duplicateRecords)
        console.log('- Prepared logs:', result.debug.preparedLogs)
        if (result.debug.insertError) {
          console.error('❌ Insert error:', result.debug.insertError)
        }
      }
      
      setImportResult(result)
    } catch (err) {
      console.error('❌ Import error:', err)
      setError(err instanceof Error ? err.message : 'Error al importar')
    } finally {
      setIsImporting(false)
      setLoading(false)
    }
  }

  const handleFinish = () => {
    router.push('/admin/logs')
  }

  const handleReset = () => {
    wizard.reset()
  }

  // Show result if import completed
  if (state.importResult) {
    return (
      <div className="space-y-6">
        <Card className="bg-background border-border">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">¡Importación completada!</h3>
            <p className="text-foreground-secondary mb-6">
              Los registros han sido importados exitosamente.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <Card className="bg-background-secondary">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-semibold text-success">{state.importResult.imported}</div>
                  <div className="text-xs text-foreground-secondary">Importados</div>
                </CardContent>
              </Card>
              <Card className="bg-background-secondary">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-semibold">{state.importResult.employeesCreated}</div>
                  <div className="text-xs text-foreground-secondary">Empleados creados</div>
                </CardContent>
              </Card>
              <Card className="bg-background-secondary">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-semibold text-accent">{state.importResult.invitationsSent}</div>
                  <div className="text-xs text-foreground-secondary">Invitaciones</div>
                </CardContent>
              </Card>
              <Card className="bg-background-secondary">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-semibold text-error">{state.importResult.failed}</div>
                  <div className="text-xs text-foreground-secondary">Fallidos</div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={handleReset}>
            Importar otro archivo
          </Button>
          <Button onClick={handleFinish} className="bg-accent hover:bg-accent/90">
            Ver registros importados
          </Button>
        </div>
      </div>
    )
  }

  // Show progress if importing
  if (isImporting) {
    return (
      <Card className="bg-background border-border">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <Clock className="h-12 w-12 mx-auto mb-4 text-accent animate-pulse" />
            <h3 className="text-lg font-medium mb-2">Importando registros...</h3>
            <p className="text-sm text-foreground-secondary">
              Por favor, no cierres esta ventana
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground-secondary">Progreso</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show confirmation
  return (
    <div className="space-y-6">
      <Card className="bg-background border-border">
        <CardContent className="p-6 space-y-6">
          <h3 className="text-lg font-medium">Resumen de la importación</h3>

          {/* File Info */}
          <div className="flex items-center gap-3 p-4 bg-background-secondary rounded-lg">
            <FileSpreadsheet className="h-8 w-8 text-success" />
            <div>
              <p className="font-medium">{state.file?.name}</p>
              <p className="text-sm text-foreground-secondary">
                {state.fileData?.totalRows} registros totales
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-background-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-foreground-secondary" />
                <span className="text-sm text-foreground-secondary">Registros a importar</span>
              </div>
              <div className="text-2xl font-semibold">{validRecords}</div>
            </div>

            <div className="p-4 bg-background-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-foreground-secondary" />
                <span className="text-sm text-foreground-secondary">Empleados a crear</span>
              </div>
              <div className="text-2xl font-semibold">{employeesToCreate}</div>
            </div>

            <div className="p-4 bg-background-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-foreground-secondary" />
                <span className="text-sm text-foreground-secondary">Invitaciones a enviar</span>
              </div>
              <div className="text-2xl font-semibold text-accent">{invitationsToSend}</div>
            </div>
          </div>

          {/* Warnings */}
          {state.previewRecords.some(r => !r.isValid) && (
            <div className="p-4 bg-warning-muted border border-warning/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-warning font-medium">
                    Hay registros con errores
                  </p>
                  <p className="text-sm text-warning/80 mt-1">
                    {state.previewRecords.filter(r => !r.isValid).length} registros no serán importados 
                    debido a errores de validación.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Final Warning */}
          <div className="p-4 bg-error-muted border border-error/20 rounded-lg">
            <p className="text-sm text-error">
              <strong>Esta acción no se puede deshacer</strong>
            </p>
            <p className="text-sm text-error/80 mt-1">
              Una vez confirmada, los registros se importarán a la base de datos 
              y los empleados se crearán en el sistema.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleImport}
          disabled={validRecords === 0}
          className="bg-accent hover:bg-accent/90"
        >
          Confirmar e Importar
        </Button>
      </div>
    </div>
  )
}
