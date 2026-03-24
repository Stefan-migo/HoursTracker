import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Clock, User, LayoutDashboard, Users, FileSpreadsheet, AlertTriangle, Clock4 } from 'lucide-react'
import { LogoutButton } from './logout-button'
import { ThemeSwitch } from '@/components/theme-switch'
import { Suspense } from 'react'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return {
    userName: profile?.full_name || null,
    userRole: profile?.role || 'worker'
  }
}

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const { userName, userRole } = user

  return (
    <div className="min-h-screen bg-background" suppressHydrationWarning>
      <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-40" suppressHydrationWarning>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
          <div className="flex justify-between items-center h-14" suppressHydrationWarning>
            <div className="flex items-center gap-4" suppressHydrationWarning>
              <Link href="/" className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                <span className="font-semibold text-lg text-foreground">HoursTracker</span>
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-4" suppressHydrationWarning>
              <div className="flex items-center gap-2 text-sm" suppressHydrationWarning>
                <div className="h-8 w-8 rounded-full bg-accent-muted flex items-center justify-center" suppressHydrationWarning>
                  <User className="h-4 w-4 text-accent" />
                </div>
                <div className="flex flex-col" suppressHydrationWarning>
                  <span className="font-medium text-foreground text-sm leading-none">{userName || 'Usuario'}</span>
                  <span className="text-xs text-foreground-secondary">
                    {userRole === 'admin' ? 'Administrador' : 'Trabajador'}
                  </span>
                </div>
              </div>
              <Suspense fallback={<div className="h-9 w-9 animate-pulse bg-background-secondary rounded" />}>
                <ThemeSwitch />
              </Suspense>
              <LogoutButton />
            </div>

            <div className="flex md:hidden items-center gap-2" suppressHydrationWarning>
              <Suspense fallback={<div className="h-9 w-9 animate-pulse bg-background-secondary rounded" />}>
                <ThemeSwitch />
              </Suspense>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex w-64 bg-background-secondary border-r border-border min-h-[calc(100vh-3.5rem)]">
          <nav className="flex flex-col gap-1 p-4 w-full">
            <Link
              href={`/${userRole}`}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            {userRole === 'admin' && (
              <>
                <Link
                  href="/admin/workers"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
                >
                  <Users className="h-4 w-4" />
                  Trabajadores
                </Link>
                <Link
                  href="/admin/logs"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
                >
                  <Clock4 className="h-4 w-4" />
                  Registros
                </Link>
                <Link
                  href="/admin/import"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar Excel
                </Link>
                <Link
                  href="/admin/disputes"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Mediaciones
                </Link>
              </>
            )}
            {userRole === 'worker' && (
              <>
                <Link
                  href="/worker/my-logs"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
                >
                  <Clock4 className="h-4 w-4" />
                  Mis Registros
                </Link>
                <Link
                  href="/worker/disputes"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Mis Mediaciones
                </Link>
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}