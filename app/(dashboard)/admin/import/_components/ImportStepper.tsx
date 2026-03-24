'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import type { ImportStep } from '@/lib/import/types'

const STEP_CONFIG = [
  { id: 'upload', label: 'Archivo', index: 0 },
  { id: 'transform', label: 'Transformar', index: 1 },
  { id: 'preview', label: 'Vista Previa', index: 2 },
  { id: 'employees', label: 'Empleados', index: 3 },
  { id: 'confirm', label: 'Confirmar', index: 4 },
]

interface StepperProps {
  currentStep: ImportStep
}

export function ImportStepper({ currentStep }: StepperProps) {
  return (
    <div className="w-full">
      {/* Desktop */}
      <div className="hidden sm:flex items-center justify-between mb-8">
        {STEP_CONFIG.map((step, index) => {
          const isCompleted = currentStep > step.index + 1
          const isCurrent = currentStep === step.index + 1
          const isPending = currentStep < step.index + 1

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200',
                    isCompleted && 'bg-success text-white',
                    isCurrent && 'bg-accent text-white ring-4 ring-accent/20',
                    isPending && 'bg-background-tertiary text-foreground-secondary border-2 border-border'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    isCurrent && 'text-accent',
                    isCompleted && 'text-success',
                    isPending && 'text-foreground-secondary'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEP_CONFIG.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-4 transition-all duration-300',
                    isCompleted ? 'bg-success' : 'bg-border'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Paso {currentStep} de {STEP_CONFIG.length}
          </span>
          <span className="text-sm text-foreground-secondary">
            {STEP_CONFIG[currentStep - 1]?.label}
          </span>
        </div>
        <div className="w-full h-2 bg-background-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / STEP_CONFIG.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
