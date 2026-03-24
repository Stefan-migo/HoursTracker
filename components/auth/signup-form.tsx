'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, User, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'

export function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const router = useRouter()

  const ADMIN_SIGNUP_CODE = 'ADMIN2024'

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!fullName || !email || !password) {
      setError('Todos los campos son requeridos')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setIsLoading(false)
      return
    }

    if (isAdmin && adminCode !== ADMIN_SIGNUP_CODE) {
      setError('Código de administrador inválido')
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: isAdmin ? 'admin' : 'employee',
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      toast.error('Error en el registro', {
        description: signUpError.message,
      })
      setIsLoading(false)
      return
    }

    if (data.user) {
      toast.success('¡Registro exitoso!', {
        description: isAdmin 
          ? 'Cuenta de administrador creada. Ya puedes iniciar sesión.' 
          : 'Cuenta creada. Espera a que un administrador active tu cuenta.',
      })
      
      if (isAdmin) {
        router.push('/login')
      } else {
        router.push('/login')
      }
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
      <Card className="w-full max-w-sm animate-scale-in">
        <CardHeader className="space-y-3 text-center pb-2">
          <div className="flex justify-center">
            <div className="p-3 bg-accent-muted rounded-xl">
              <Clock className="h-6 w-6 text-accent" />
            </div>
          </div>
          <CardTitle className="text-xl">Crear Cuenta</CardTitle>
          <CardDescription>
            Regístrate en HoursTracker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-medium text-foreground-secondary">
                Nombre completo
              </label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Juan Pérez"
                required
                disabled={isLoading}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-foreground-secondary">
                Correo electrónico
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-foreground-secondary">
                Contraseña
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-medium text-foreground-secondary">
                Confirmar contraseña
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <label htmlFor="isAdmin" className="text-sm text-foreground-secondary flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Registrar como administrador
              </label>
            </div>

            {isAdmin && (
              <div className="space-y-1.5 animate-fade-in">
                <label htmlFor="adminCode" className="text-xs font-medium text-foreground-secondary">
                  Código de administrador
                </label>
                <Input
                  id="adminCode"
                  name="adminCode"
                  type="password"
                  placeholder="Código secreto"
                  required={isAdmin}
                  disabled={isLoading}
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                />
                <p className="text-[10px] text-foreground-secondary">
                  Este código se proporciona durante la configuración inicial
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-error bg-error-muted rounded-md border border-error/20">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Crear cuenta
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-foreground-secondary">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-accent hover:underline font-medium">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
