'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, UserPlus, KeyRound, Mail, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      setError('Email y contraseña son requeridos')
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      toast.error('Error de autenticación', {
        description: signInError.message,
      })
      setIsLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      toast.success('Sesión iniciada correctamente')
      router.push(profile?.role === 'admin' ? '/admin' : '/employee')
    } else {
      router.push('/employee')
    }
    router.refresh()
  }

  async function handleResetPassword() {
    if (!resetEmail) {
      toast.error('Ingresa tu correo electrónico')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    if (resetError) {
      toast.error('Error al enviar correo de recuperación', {
        description: resetError.message,
      })
      setIsLoading(false)
      return
    }

    setResetSent(true)
    setIsLoading(false)
  }

  if (isResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
        <Card className="w-full max-w-sm animate-scale-in">
          <CardHeader className="space-y-3 text-center pb-2">
            <div className="flex justify-center">
              <div className="p-3 bg-accent-muted rounded-xl">
                <KeyRound className="h-6 w-6 text-accent" />
              </div>
            </div>
            <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
            <CardDescription>
              {resetSent 
                ? 'Revisa tu correo electrónico'
                : 'Ingresa tu correo para recibir un enlace de recuperación'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetSent ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 p-6 bg-success/10 rounded-lg">
                  <CheckCircle2 className="h-12 w-12 text-success" />
                  <p className="text-sm text-foreground-secondary text-center">
                    Se ha enviado un enlace de recuperación a <strong>{resetEmail}</strong>
                  </p>
                  <p className="text-xs text-foreground-secondary text-center">
                    Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setIsResetMode(false)
                    setResetSent(false)
                    setResetEmail('')
                  }}
                >
                  Volver al inicio de sesión
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label htmlFor="resetEmail" className="text-xs font-medium text-foreground-secondary flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Correo electrónico
                    </label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="tu@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  disabled={isLoading}
                  onClick={handleResetPassword}
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Enviar enlace de recuperación
                    </>
                  )}
                </Button>

                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setIsResetMode(false)
                    setResetEmail('')
                    setError(null)
                  }}
                >
                  Cancelar
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
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
          <CardTitle className="text-xl">HoursTracker</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={handleSubmit} className="space-y-3">
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
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-error bg-error-muted rounded-md border border-error/20 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsResetMode(true)}
              className="text-sm text-accent hover:underline font-medium"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <div className="text-center text-sm text-foreground-secondary">
            ¿No tienes cuenta?{' '}
            <Link href="/signup" className="text-accent hover:underline font-medium flex items-center justify-center gap-1">
              <UserPlus className="h-3 w-3" />
              Regístrate
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
