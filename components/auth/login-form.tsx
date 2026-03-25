'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, UserPlus, KeyRound, Mail, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'

function CreatePasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!password || !confirmPassword) {
      setError('Ambos campos son requeridos')
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

    try {
      const response = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al configurar contraseña')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      toast.success('Contraseña configurada correctamente')

      if (result.auto_login && result.access_token) {
        const callbackUrl = `/auth/callback?access_token=${encodeURIComponent(result.access_token)}&refresh_token=${encodeURIComponent(result.refresh_token || '')}&type=invite`
        router.push(callbackUrl)
      } else {
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (err) {
      setError('Error al conectar con el servidor')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
        <Card className="w-full max-w-sm animate-scale-in">
          <CardHeader className="space-y-3 text-center pb-2">
            <div className="flex justify-center">
              <div className="p-3 bg-success/10 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-success" />
              </div>
            </div>
            <CardTitle className="text-xl">¡Cuenta activada!</CardTitle>
            <CardDescription>
              Tu contraseña ha sido configurada correctamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 p-6 bg-success/10 rounded-lg">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <p className="text-sm text-foreground-secondary text-center">
                Ya puedes iniciar sesión con tu nueva contraseña
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => router.push('/login')}
            >
              Ir a iniciar sesión
            </Button>
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
              <KeyRound className="h-6 w-6 text-accent" />
            </div>
          </div>
          <CardTitle className="text-xl">Crear contraseña</CardTitle>
          <CardDescription>
            Ingresa una contraseña segura para tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-foreground-secondary">
                Nueva contraseña
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                autoComplete="new-password"
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
                  Configurando...
                </>
              ) : (
                'Crear contraseña'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const inviteToken = searchParams.get('invite')
  const confirmed = searchParams.get('confirmed')
  const confirmError = searchParams.get('error')
  const fromInvite = searchParams.get('from_invite')
  const inviteEmail = searchParams.get('email')
  
  if (inviteToken) {
    return <CreatePasswordForm />
  }
  
  if (fromInvite === 'true') {
    return <CreatePasswordForm />
  }

  if (confirmed === 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
        <Card className="w-full max-w-sm animate-scale-in">
          <CardHeader className="space-y-3 text-center pb-2">
            <div className="flex justify-center">
              <div className="p-3 bg-success/10 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-success" />
              </div>
            </div>
            <CardTitle className="text-xl">¡Cuenta confirmada!</CardTitle>
            <CardDescription>
              Tu cuenta ha sido activada correctamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 p-6 bg-success/10 rounded-lg">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <p className="text-sm text-foreground-secondary text-center">
                Ya puedes iniciar sesión con tus credenciales
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.delete('confirmed')
                router.replace(url.toString())
              }}
            >
              Ir a iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (confirmError === 'confirmation_failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
        <Card className="w-full max-w-sm animate-scale-in">
          <CardHeader className="space-y-3 text-center pb-2">
            <div className="flex justify-center">
              <div className="p-3 bg-error/10 rounded-xl">
                <AlertCircle className="h-6 w-6 text-error" />
              </div>
            </div>
            <CardTitle className="text-xl">Error de confirmación</CardTitle>
            <CardDescription>
              No se pudo confirmar tu cuenta. El enlace puede haber expirado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-error/10 rounded-lg">
              <p className="text-sm text-foreground-secondary text-center">
                Por favor, intenta registrarte nuevamente o contacta al administrador.
              </p>
            </div>
            <Button 
              variant="outline"
              className="w-full" 
              onClick={() => router.push('/signup')}
            >
              Volver al registro
            </Button>
            <Button 
              variant="ghost"
              className="w-full" 
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.delete('error')
                router.replace(url.toString())
              }}
            >
              Ir a iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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
      router.push(profile?.role === 'admin' ? '/admin' : '/worker')
    } else {
      router.push('/worker')
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
