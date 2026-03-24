'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useImportWizard } from '@/lib/hooks/useImportWizard'
import { UploadStep } from './steps/UploadStep'
import { TransformStep } from './steps/TransformStep'
import { PreviewStep } from './steps/PreviewStep'
import { EmployeeStep } from './steps/EmployeeStep'
import { ConfirmStep } from './steps/ConfirmStep'
import type { ImportStep } from '@/lib/import/types'
import type { TransformedRecord } from '@/lib/transformers/types'

const steps: { number: ImportStep; title: string; description: string }[] = [
  { number: 1, title: 'Archivo', description: 'Sube tu archivo Excel o CSV' },
  { number: 2, title: 'Transformar', description: 'Detecta y transforma formato' },
  { number: 3, title: 'Vista Previa', description: 'Revisa los datos' },
  { number: 4, title: 'Empleados', description: 'Gestiona empleados nuevos' },
  { number: 5, title: 'Confirmar', description: 'Importa los registros' }
]

export function ImportWizard() {
  const wizard = useImportWizard()
  const { state, nextStep, prevStep, reset, canProceedToNext, setTransformedRecords } = wizard

  const handleTransformComplete = (records: TransformedRecord[]) => {
    setTransformedRecords(records)
    nextStep()
  }

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <UploadStep wizard={wizard} />
      case 2:
        return state.fileData ? (
          <TransformStep
            headers={state.fileData.headers}
            rows={state.fileData.rows}
            onTransformComplete={handleTransformComplete}
            onBack={prevStep}
          />
        ) : null
      case 3:
        return <PreviewStep wizard={wizard} />
      case 4:
        return <EmployeeStep wizard={wizard} />
      case 5:
        return <ConfirmStep wizard={wizard} />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Importar Registros</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            Importa registros de tiempo desde Excel o CSV
          </p>
        </div>
        {state.currentStep > 1 && (
          <Button variant="ghost" size="sm" onClick={reset} className="text-foreground-secondary">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reiniciar
          </Button>
        )}
      </div>

      {/* Stepper */}
      <Card className="bg-background border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = state.currentStep > step.number
              const isCurrent = state.currentStep === step.number

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    {/* Step Circle */}
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                        transition-all duration-200
                        ${isCompleted 
                          ? 'bg-success text-white' 
                          : isCurrent 
                            ? 'bg-accent text-white ring-4 ring-accent/20' 
                            : 'bg-background-tertiary text-foreground-secondary border-2 border-border'
                        }
                      `}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.number
                      )}
                    </div>
                    
                    {/* Step Title */}
                    <span 
                      className={`
                        mt-2 text-xs font-medium hidden sm:block
                        ${isCurrent ? 'text-foreground' : 'text-foreground-secondary'}
                      `}
                    >
                      {step.title}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div 
                      className={`
                        flex-1 h-0.5 mx-4 transition-all duration-300
                        ${state.currentStep > step.number ? 'bg-success' : 'bg-border'}
                      `}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {state.error && (
        <div className="p-4 bg-error-muted border border-error/20 rounded-lg">
          <p className="text-sm text-error">{state.error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="animate-fade-in">
        {renderStep()}
      </div>

      {/* Navigation Buttons - Only show for steps that use wizard navigation */}
      {state.currentStep !== 2 && state.currentStep !== 5 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={state.currentStep === 1 || state.isLoading}
            className="border-border"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <Button
            onClick={nextStep}
            disabled={!canProceedToNext() || state.isLoading}
            className="bg-accent hover:bg-accent/90"
          >
            {state.isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Procesando...
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
