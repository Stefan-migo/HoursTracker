import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const { data: workers, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'employee')

    if (error) {
      throw error
    }

    return NextResponse.json({
      workers: workers || []
    })
  } catch (error) {
    console.error('Error fetching workers:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error al obtener trabajadores'
    }, { status: 500 })
  }
}
