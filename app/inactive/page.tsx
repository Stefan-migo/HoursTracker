import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, LogOut, AlertCircle, History, GitCompare } from 'lucide-react'

export default async function InactivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar que el usuario es empleado (los admins no deberían llegar aquí)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  // Si es admin o está activo, redirigir al dashboard
  if (profile?.role === 'admin' || profile?.is_active) {
    redirect('/admin')
  }

  async function handleSignOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-700">
            Cuenta Inactiva
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-600">
            Tu cuenta ha sido desactivada por el administrador. 
            Actualmente no puedes registrar horas de entrada y salida.
          </p>

          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <p className="text-sm font-medium text-gray-700">Aún puedes:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2 justify-center">
                <History className="h-4 w-4" />
                Ver tu historial de registros
              </li>
              <li className="flex items-center gap-2 justify-center">
                <GitCompare className="h-4 w-4" />
                Ver la comparación de registros
              </li>
            </ul>
          </div>

          <p className="text-sm text-gray-500">
            Contacta al administrador de RRHH para activator tu cuenta nuevamente.
          </p>

          <div className="pt-4 space-y-2">
            <div className="flex gap-2 justify-center">
              <Button variant="outline" asChild>
                <Link href="/worker/my-logs">Ver Mis Registros</Link>
              </Button>
            </div>
            <form action={handleSignOut}>
              <Button variant="ghost" type="submit" className="w-full text-gray-500">
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}