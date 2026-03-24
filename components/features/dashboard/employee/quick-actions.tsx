'use client'

import Link from 'next/link'
import { Clock, ChevronRight } from 'lucide-react'

const quickActions = [
  {
    label: 'Mis Registros',
    href: '/employee/my-logs',
    icon: Clock,
    description: 'Ver y gestionar tus registros',
  },
]

export function QuickActions() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground-secondary uppercase tracking-wide">
        Accesos Rápidos
      </h3>
      <div className="flex flex-col gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center justify-between w-full h-auto py-3 px-4 text-left border border-border rounded-lg bg-background hover:border-accent/30 hover:bg-accent-muted/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background-secondary flex items-center justify-center group-hover:bg-accent-muted transition-colors duration-200">
                  <Icon className="h-5 w-5 text-foreground-secondary group-hover:text-accent transition-colors duration-200" />
                </div>
                <div>
                  <span className="font-medium text-foreground block">
                    {action.label}
                  </span>
                  <span className="text-xs text-foreground-secondary">
                    {action.description}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-foreground-secondary group-hover:text-accent transition-colors duration-200" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
