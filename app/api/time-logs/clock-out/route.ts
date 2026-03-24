import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { localDateTimeToUTC } from '@/lib/utils'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) {
    return NextResponse.json({ error: 'Tu cuenta está inactiva' }, { status: 403 })
  }

  // Get local date and time from request body or use current
  let body = {}
  try {
    body = await request.json()
  } catch {
    // No body, use current time
  }

  const { date: bodyDate, clock_out: bodyClockOut } = body as { date?: string; clock_out?: string }

  // Get current date/time in local timezone
  const now = new Date()
  const localDate = bodyDate || (() => {
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })()

  // Convert to UTC ISO string for PostgreSQL TIMESTAMPTZ
  let clockOutUTC: string
  if (bodyClockOut) {
    // Manual entry: convert local time to UTC
    clockOutUTC = localDateTimeToUTC(localDate, bodyClockOut)
  } else {
    // Automatic entry: use current time in UTC
    clockOutUTC = now.toISOString()
  }

  // Find the entry without clock_out for this date
  const { data: existing } = await supabase
    .from('time_logs')
    .select('id, clock_in')
    .eq('user_id', user.id)
    .eq('date', localDate)
    .is('clock_out', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'No hay entrada sin salida para esta fecha' }, { status: 400 })
  }

  // Calculate total hours
  const startTime = new Date(existing.clock_in)
  const endTime = new Date(clockOutUTC)
  const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)

  const { data, error } = await supabase
    .from('time_logs')
    .update({
      clock_out: clockOutUTC,
      total_hours: totalHours,
      is_manual: !!bodyClockOut,
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating time log:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}