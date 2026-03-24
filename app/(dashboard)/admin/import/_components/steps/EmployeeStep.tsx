'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Mail, Users } from 'lucide-react'
import type { UseImportWizardReturn } from '@/lib/hooks/useImportWizard'
import type { NewEmployee } from '@/lib/import/types'

interface EmployeeStepProps {
  wizard: UseImportWizardReturn
}

export function EmployeeStep({ wizard }: EmployeeStepProps) {
  const { state, updateNewEmployee } = wizard
  const [selectAllCreate, setSelectAllCreate] = useState(false)
  const [selectAllInvite, setSelectAllInvite] = useState(false)

  const handleSelectAllCreate = (checked: boolean) => {
    setSelectAllCreate(checked)
    state.newEmployees.forEach(emp => {
      updateNewEmployee(emp.email, { createProfile: checked })
    })
  }

  const handleSelectAllInvite = (checked: boolean) => {
    setSelectAllInvite(checked)
    state.newEmployees.forEach(emp => {
      if (emp.createProfile) {
        updateNewEmployee(emp.email, { sendInvitation: checked })
      }
    })
  }

  const employeesToCreate = state.newEmployees.filter(e => e.createProfile).length
  const employeesToInvite = state.newEmployees.filter(e => e.createProfile && e.sendInvitation).length

  if (state.newEmployees.length === 0) {
    return (
      <Card className="bg-background border-border">
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-foreground-secondary" />
          <h3 className="text-lg font-medium mb-2">No se detectaron empleados nuevos</h3>
          <p className="text-sm text-foreground-secondary">
            Todos los emails en el archivo ya existen en el sistema.
            Puedes continuar con la importación.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 bg-accent-muted border border-accent/20 rounded-lg">
        <p className="text-sm text-accent">
          <strong>Empleados nuevos detectados</strong>
        </p>
        <p className="text-sm text-accent/80 mt-1">
          Se encontraron {state.newEmployees.length} emails que no existen en el sistema. 
          Selecciona cuáles deseas crear y si deseas enviarles invitación.
        </p>
      </div>

      {/* Global Actions */}
      <div className="flex flex-wrap gap-4 p-4 bg-background-secondary rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={selectAllCreate}
            onCheckedChange={handleSelectAllCreate}
          />
          <span className="text-sm">Crear todos los perfiles</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={selectAllInvite}
            onCheckedChange={handleSelectAllInvite}
            disabled={employeesToCreate === 0}
          />
          <span className="text-sm">Enviar invitación a todos</span>
        </label>
      </div>

      {/* Summary */}
      <div className="flex gap-4">
        <Badge variant="secondary" className="text-xs">
          <UserPlus className="h-3 w-3 mr-1" />
          {employeesToCreate} por crear
        </Badge>
        <Badge variant="secondary" className="text-xs">
          <Mail className="h-3 w-3 mr-1" />
          {employeesToInvite} invitaciones
        </Badge>
      </div>

      {/* Employee Cards */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {state.newEmployees.map((employee) => (
          <Card 
            key={employee.email}
            className={`
              bg-background border-border transition-all
              ${!employee.createProfile ? 'opacity-60' : ''}
            `}
          >
            <CardContent className="p-4 space-y-4">
              {/* Email Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={employee.createProfile}
                    onCheckedChange={(checked) => 
                      updateNewEmployee(employee.email, { createProfile: checked as boolean })
                    }
                  />
                  <span className="font-medium">{employee.email}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {employee.rowNumbers.length} registros
                </Badge>
              </div>

              {/* Details (only if creating) */}
              {employee.createProfile && (
                <div className="pl-6 space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Nombre completo <span className="text-error">*</span>
                    </label>
                    <Input
                      value={employee.fullName}
                      onChange={(e) => 
                        updateNewEmployee(employee.email, { fullName: e.target.value })
                      }
                      placeholder="Ej: Juan Pérez"
                      className={!employee.fullName.trim() ? 'border-error' : ''}
                    />
                    {!employee.fullName.trim() && (
                      <p className="text-xs text-error mt-1">El nombre es obligatorio</p>
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={employee.sendInvitation}
                      onCheckedChange={(checked) => 
                        updateNewEmployee(employee.email, { sendInvitation: checked as boolean })
                      }
                    />
                    <span className="text-sm">Enviar email de invitación</span>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
