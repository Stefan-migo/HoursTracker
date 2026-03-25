'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client-auth'
import { Spinner } from '@/components/ui/spinner'

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient()
      
      const code = searchParams.get('code')
      const token = searchParams.get('token')
      const type = searchParams.get('type')
      const next = searchParams.get('next') ?? '/worker'
      const accessTokenParam = searchParams.get('access_token')
      
      console.log('Callback page:', { code, token, type, accessTokenParam, hash: window.location.hash })

      try {
        if (accessTokenParam) {
          console.log('Setting session from access_token param...')
          const { data: { user }, error } = await supabase.auth.setSession({
            access_token: accessTokenParam,
            refresh_token: searchParams.get('refresh_token') || '',
          })

          if (error) {
            console.error('Error setting session from param:', error)
            router.push('/login?error=callback_failed')
            return
          }

          if (user) {
            console.log('User logged in from param:', user.email)
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('role, invitation_status')
              .eq('id', user.id)
              .single()
            
            const needsPasswordSetup = profile?.invitation_status === 'pending'
            
            if (needsPasswordSetup) {
              router.push('/login?from_invite=true')
            } else {
              const redirectPath = profile?.role === 'admin' ? '/admin' : '/worker'
              router.push(redirectPath)
            }
            return
          }
        }

        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken) {
            console.log('Setting session from hash...')
            const { data: { user }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })

            if (error) {
              console.error('Error setting session:', error)
              router.push('/login?error=callback_failed')
              return
            }

            if (user) {
              console.log('User logged in:', user.email)
              
              const { data: profile } = await supabase
                .from('profiles')
                .select('role, invitation_status')
                .eq('id', user.id)
                .single()
              
              const needsPasswordSetup = profile?.invitation_status === 'pending'
              
              if (needsPasswordSetup) {
                router.push('/login?from_invite=true')
              } else {
                const redirectPath = profile?.role === 'admin' ? '/admin' : '/worker'
                router.push(redirectPath)
              }
              return
            }
          }
        }

        if (code) {
          console.log('Exchanging code for session...')
          const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('Error exchanging code:', error)
            router.push('/login?error=callback_failed')
            return
          }

          if (user) {
            console.log('User from code:', user.email)
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('role, invitation_status')
              .eq('id', user.id)
              .single()
            
            const needsPasswordSetup = profile?.invitation_status === 'pending'
            
            if (needsPasswordSetup) {
              router.push('/login?from_invite=true')
            } else {
              const redirectPath = profile?.role === 'admin' ? '/admin' : '/worker'
              router.push(redirectPath)
            }
            return
          }
        }

        console.log('No valid callback data found')
        router.push('/login?error=callback_failed')
      } catch (err) {
        console.error('Callback error:', err)
        router.push('/login?error=callback_failed')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-foreground-secondary">Activando tu cuenta...</p>
      </div>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background-secondary">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-foreground-secondary">Cargando...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  )
}
