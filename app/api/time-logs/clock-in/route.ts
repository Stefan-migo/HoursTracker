import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { localDateTimeToUTC, getLocalDateString } from '@/lib/utils'

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

  const { date: bodyDate, clock_in: bodyClockIn } = body as { date?: string; clock_in?: string }

  // Get current date in local timezone
  const localDate = bodyDate || getLocalDateString()

  // Use client-provided time if available, otherwise fall back to server time
  let clockInTime: string
  if (bodyClockIn) {
    // If it's a full ISO string (contains 'T' and more after), parse normally
    if (bodyClockIn.includes('T')) {
      clockInTime = new Date(bodyClockIn).toISOString()
    } 
    // If it's just HH:MM, combine with the date
    else if (bodyClockIn.includes(':')) {
      const [hours, minutes] = bodyClockIn.split(':')
      const localDateTime = new Date(`${localDate}T${hours}:${minutes}:00`)
      clockInTime = localDateTime.toISOString()
    }
    else {
      clockInTime = new Date(bodyClockIn).toISOString()
    }
  } else {
    // Automatic entry: use server current time
    clockInTime = new Date().toISOString()
  }

  // Check if there's already a clock_in for this date
  const { data: existing } = await supabase
    .from('time_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', localDate)
    .not('clock_in', 'is', null)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Ya existe una entrada para esta fecha' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('time_logs')
    .insert({
      user_id: user.id,
      date: localDate,
      clock_in: clockInTime,
      is_official: false,
      is_manual: !!bodyClockIn,
      marked_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error inserting time log:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}