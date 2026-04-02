import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Clock, User, LayoutDashboard, Users, FileSpreadsheet, AlertTriangle, Clock4, Menu, X } from 'lucide-react'
import { LogoutButton } from './logout-button'
import { ThemeSwitch } from '@/components/theme-switch'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Suspense } from 'react'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

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
    userRole: profile?.role || 'employee'
  }
}

async function getMediationSettings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'mediations_enabled')
    .single()
  
  return data?.value?.enabled ?? false
}

async function getMediationProcessSettings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'mediation_process_enabled')
    .single()
  
  return data?.value?.enabled ?? true
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
  const mediationsEnabled = await getMediationSettings()

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
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-background">
                  <SheetHeader className="mb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-accent" />
                      HoursTracker
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-1">
                    <div className="mb-4 p-3 bg-background-secondary rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{userName || 'Usuario'}</div>
                          <div className="text-xs text-foreground-secondary">
                            {userRole === 'admin' ? 'Administrador' : 'Trabajador'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <SheetClose asChild>
                      <Link
                        href={userRole === 'admin' ? '/admin' : '/worker'}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground hover:bg-background-secondary"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </SheetClose>
                    {userRole === 'admin' && (
                      <>
                        <SheetClose asChild>
                          <Link
                            href="/admin/workers"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground hover:bg-background-secondary"
                          >
                            <Users className="h-4 w-4" />
                            Trabajadores
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link
                            href="/admin/logs"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground hover:bg-background-secondary"
                          >
                            <Clock4 className="h-4 w-4" />
                            Registros
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link
                            href="/admin/import"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground hover:bg-background-secondary"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                            Importar Excel
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link
                            href="/admin/disputes"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground hover:bg-background-secondary"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            Mediaciones
                          </Link>
                        </SheetClose>
                      </>
                    )}
                    {(userRole === 'employee' || userRole === 'worker') && (
                      <>
                        <SheetClose asChild>
                          <Link
                            href="/worker/my-logs"
                            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground hover:bg-background-secondary"
                          >
                            <Clock4 className="h-4 w-4" />
                            Mis Registros
                          </Link>
                        </SheetClose>
                        {mediationsEnabled && (
                          <SheetClose asChild>
                            <Link
                              href="/worker/disputes"
                              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground hover:bg-background-secondary"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              Mis Mediaciones
                            </Link>
                          </SheetClose>
                        )}
                      </>
                    )}
                    <div className="border-t border-border mt-4 pt-4">
                      <LogoutButton />
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex w-64 bg-background-secondary border-r border-border min-h-[calc(100vh-3.5rem)]">
          <nav className="flex flex-col gap-1 p-4 w-full">
            <Link
              href={userRole === 'admin' ? '/admin' : '/worker'}
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
            {(userRole === 'employee' || userRole === 'worker') && (
              <>
                <Link
                  href="/worker/my-logs"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
                >
                  <Clock4 className="h-4 w-4" />
                  Mis Registros
                </Link>
                {mediationsEnabled && (
                  <Link
                    href="/worker/disputes"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-foreground-secondary hover:bg-background-tertiary hover:text-foreground"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Mis Mediaciones
                  </Link>
                )}
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden">
          <TooltipProvider delayDuration={0}>
            {children}
          </TooltipProvider>
        </main>
      </div>
    </div>
  )
}