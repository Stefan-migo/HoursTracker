'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface StaleNotificationProps {
  hoursInactive: number
  otherParty: {
    name: string
    email: string
    role: 'admin' | 'employee'
  }
  lastAdminActivity: string | null
  lastEmployeeActivity: string | null
  isAdmin: boolean
}

export function StaleNotification({
  hoursInactive,
  otherParty,
  lastAdminActivity,
  lastEmployeeActivity,
  isAdmin,
}: StaleNotificationProps) {
  // Determine who last updated
  const adminHasUpdated = lastAdminActivity !== null
  const employeeHasUpdated = lastEmployeeActivity !== null

  // If someone has updated recently (within last 24h), show different message
  const recentThreshold = 24 * 60 * 60 * 1000 // 24 hours
  const adminRecent = adminHasUpdated && 
    (new Date().getTime() - new Date(lastAdminActivity!).getTime()) < recentThreshold
  const employeeRecent = employeeHasUpdated && 
    (new Date().getTime() - new Date(lastEmployeeActivity!).getTime()) < recentThreshold

  const handleContact = () => {
    const subject = encodeURIComponent('Mediación de Registro de Horas')
    const body = encodeURIComponent(
      `Hola ${otherParty.name},\n\n` +
      `Estamos revisando una mediación de horas y me gustaría conversar contigo para llegar a un acuerdo.\n\n` +
      `¿Podemos coordinar un momento para hablarlo?\n\n` +
      `Saludos.`
    )
    
    window.location.href = `mailto:${otherParty.email}?subject=${subject}&body=${body}`
    toast.success('Abriendo cliente de correo')
  }

  // Determine message based on situation
  let title: string
  let message: string
  let icon: React.ReactNode
  let showContactButton = true

  if (hoursInactive >= 48 && !adminHasUpdated && !employeeHasUpdated) {
    // Both inactive for 48+ hours
    title = '¿Ninguno ha ajustado sus horas?'
    message = 'Esta mediación lleva más de 48 horas sin actividad. A veces una conversación breve aclara malentendidos y puede ser más rápido que ajustar registros.'
    icon = <MessageCircle className="h-6 w-6 text-accent" />
  } else if (isAdmin && employeeRecent) {
    // Employee updated recently, admin hasn't
    title = 'El trabajador ha propuesto ajustes'
    message = 'El trabajador ha realizado cambios recientemente. Revisa los valores propuestos y acepta o realiza una contrapropuesta.'
    icon = <Clock className="h-6 w-6 text-warning" />
    showContactButton = false
  } else if (!isAdmin && adminRecent) {
    // Admin updated recently, employee hasn't
    title = 'El administrador ha propuesto ajustes'
    message = 'El administrador ha realizado cambios recientemente. Revisa los valores propuestos y acepta o realiza una contrapropuesta.'
    icon = <Clock className="h-6 w-6 text-warning" />
    showContactButton = false
  } else {
    // General stale notification
    title = '¿Necesitan conversar?'
    message = `Esta mediación lleva ${Math.round(hoursInactive)} horas sin actualizaciones. Si tienen dudas, una conversación puede ayudar a resolverlas.`
    icon = <MessageCircle className="h-6 w-6 text-accent" />
  }

  return (
    <Card className="bg-gradient-to-r from-accent/5 to-accent/10 border-accent/20">
      <CardContent className="flex items-start gap-4 py-6">
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
            {icon}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-foreground">
            {title}
          </h4>
          <p className="text-sm text-foreground-secondary mt-1 leading-relaxed">
            {message}
          </p>
        </div>

        {showContactButton && (
          <Button
            onClick={handleContact}
            className="flex-shrink-0 bg-accent hover:bg-accent/90 text-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Contactar {otherParty.role === 'admin' ? 'Admin' : 'Trabajador'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
