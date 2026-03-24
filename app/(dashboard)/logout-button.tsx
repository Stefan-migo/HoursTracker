'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

export function LogoutButton() {
  const router = useRouter()

  async function handleSignOut() {
    try {
      const { createClient } = await import('@/lib/supabase/client-auth')
      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Sesión cerrada correctamente')
      router.push('/login')
      router.refresh()
    } catch (error) {
      toast.error('Error al cerrar sesión')
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      className="text-foreground-secondary hover:text-foreground"
    >
      <LogOut className="h-4 w-4 sm:mr-2" />
      <span className="hidden sm:inline">Salir</span>
    </Button>
  )
}