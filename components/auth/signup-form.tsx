'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, User, Shield, AlertTriangle, CheckCircle2, ShieldCheck, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import Link from 'next/link'

const ADMIN_SIGNUP_CODE = process.env.NEXT_PUBLIC_ADMIN_SIGNUP_CODE || 'CHANGE_ME'

export function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [adminExists, setAdminExists] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [adminCode, setAdminCode] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    async function checkAdminExists() {
      try {
        const response = await fetch('/api/auth/check-admin')
        const result = await response.json()

        if (result.adminExists) {
          setAdminExists(true)
        }
      } catch {
        setAdminExists(false)
      } finally {
        setCheckingAdmin(false)
      }
    }
    checkAdminExists()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Todos los campos son requeridos')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setIsLoading(false)
      return
    }

    if (adminCode !== ADMIN_SIGNUP_CODE) {
      setError('Código de administrador inválido')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          adminCode,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error en el registro')
        toast.error('Error en el registro', {
          description: result.error,
        })
        setIsLoading(false)
        return
      }

      toast.success('Cuenta creada')
      setSuccess(true)
    } catch (err) {
      setError('Error al conectar con el servidor')
      toast.error('Error en el registro', {
        description: 'No se pudo conectar con el servidor',
      })
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
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
            </div>
            <CardTitle className="text-xl">¡Cuenta creada!</CardTitle>
            <CardDescription>
              Tu cuenta de administrador ha sido creada exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 p-6 bg-success/10 rounded-lg">
              <ShieldCheck className="h-12 w-12 text-success" />
              <p className="text-sm text-foreground-secondary text-center">
                Ahora puedes iniciar sesión con tus credenciales
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

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
        <Card className="w-full max-w-sm animate-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" className="text-accent mb-4" />
            <p className="text-foreground-secondary text-sm">Verificando...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (adminExists && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
        <Card className="w-full max-w-sm animate-scale-in">
          <CardHeader className="space-y-3 text-center pb-2">
            <div className="flex justify-center">
              <div className="p-3 bg-warning/10 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
            </div>
            <CardTitle className="text-xl">Registro no disponible</CardTitle>
            <CardDescription>
              Ya existe un administrador registrado en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background-tertiary rounded-lg text-center">
              <p className="text-sm text-foreground-secondary mb-2">
                Para crear nuevas cuentas de usuario, por favor contacta al administrador del sistema.
              </p>
              <p className="text-xs text-foreground-secondary">
                Los trabajadores deben ser registrados por un administrador desde el panel de administración.
              </p>
            </div>

            <Link href="/login">
              <Button variant="outline" className="w-full">
                Ir a iniciar sesión
              </Button>
            </Link>
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
          <CardTitle className="text-xl">Registro de Administrador</CardTitle>
          <CardDescription>
            Crea la cuenta de administrador principal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg border border-accent/20 w-full">
                <Shield className="h-4 w-4 text-accent flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-accent">Cuenta de Administrador</p>
                  <p className="text-xs text-foreground-secondary">Esta será la cuenta principal del sistema</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="adminCode" className="text-xs font-medium text-foreground-secondary">
                Código de administrador
              </label>
              <Input
                id="adminCode"
                name="adminCode"
                type="password"
                placeholder="Código secreto"
                required
                disabled={isLoading}
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
              />
              <p className="text-[10px] text-foreground-secondary">
                Este código se proporcionó durante la configuración inicial
              </p>
            </div>

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
                  <Mail className="h-4 w-4 mr-2" />
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
