import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLocalDateString } from '@/lib/utils'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const today = getLocalDateString()

  const { data, error } = await supabase
    .from('time_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .eq('is_official', false)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching today log:', error)
  }

  return NextResponse.json(data)
}
