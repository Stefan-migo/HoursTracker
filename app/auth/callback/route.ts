import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/admin'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check user role and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        const redirectPath = profile?.role === 'admin' ? '/admin' : '/employee'
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login page if there's an error
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
