import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markClockIn() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('time_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  if (existing) {
    return { error: 'Ya existe un registro para hoy' }
  }

  const { error } = await supabase
    .from('time_logs')
    .insert({
      user_id: user.id,
      date: today,
      clock_in: new Date().toISOString(),
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/employee')
  return { success: true }
}

export async function markClockOut() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autenticado' }
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: entry } = await supabase
    .from('time_logs')
    .select('id, clock_in')
    .eq('user_id', user.id)
    .eq('date', today)
    .is('clock_out', null)
    .single()

  if (!entry) {
    return { error: 'No hay entrada sin salida' }
  }

  const now = new Date()
  const clockIn = new Date(entry.clock_in)
  const totalHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60)

  const { error } = await supabase
    .from('time_logs')
    .update({
      clock_out: now.toISOString(),
      total_hours: Math.round(totalHours * 100) / 100,
    })
    .eq('id', entry.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/employee')
  return { success: true }
}

export async function getTodayLog() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('time_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .single()

  return data
}

export async function getTimeLogs(limit = 10, offset = 0) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: [], count: 0 }

  const { data, count } = await supabase
    .from('time_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  return { data: data || [], count: count || 0 }
}
