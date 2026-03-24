import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const employeeId = searchParams.get('employee_id')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Determine target user
  let targetUserId = user.id

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin' && employeeId) {
    targetUserId = employeeId
  } else if (employeeId && employeeId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Default to last 30 days if no dates provided
  const end = endDate || new Date().toISOString().split('T')[0]
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Get all time logs for the user in the date range
  const { data: logs, error } = await supabase
    .from('time_logs')
    .select(`
      id,
      date,
      clock_in,
      clock_out,
      total_hours,
      is_official,
      is_manual,
      marked_by,
      notes,
      profiles!time_logs_marked_by_fkey(
        full_name
      )
    `)
    .eq('user_id', targetUserId)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by date and separate official vs personal
  const comparisonByDate: Record<string, {
    date: string
    official: {
      id: string
      clock_in: string | null
      clock_out: string | null
      total_hours: number | null
      marked_by: string | null
    } | null
    personal: {
      id: string
      clock_in: string | null
      clock_out: string | null
      total_hours: number | null
      marked_by: string | null
    } | null
    hasDifference: boolean
    differences: {
      clockInDiff: number | null
      clockOutDiff: number | null
      hoursDiff: number | null
    } | null
    matchStatus: 'match' | 'partial_match' | 'missing_official' | 'missing_personal' | 'both_missing'
  }> = {}

  logs?.forEach((log: { date: string; is_official: boolean; id: string; clock_in: string | null; clock_out: string | null; total_hours: number | null; profiles?: { full_name: string | null }[] }) => {
    if (!comparisonByDate[log.date]) {
      comparisonByDate[log.date] = {
        date: log.date,
        official: null,
        personal: null,
        hasDifference: false,
        differences: null,
        matchStatus: 'both_missing',
      }
    }

    const entry = {
      id: log.id,
      clock_in: log.clock_in,
      clock_out: log.clock_out,
      total_hours: log.total_hours,
      marked_by: log.profiles?.[0]?.full_name || null,
    }

    if (log.is_official) {
      comparisonByDate[log.date].official = entry
    } else {
      comparisonByDate[log.date].personal = entry
    }
  })

  // Calculate differences for each date
  Object.values(comparisonByDate).forEach((day) => {
    const { official, personal } = day

    if (!official && !personal) {
      day.matchStatus = 'both_missing'
    } else if (!official && personal) {
      day.matchStatus = 'missing_official'
      day.hasDifference = true
    } else if (official && !personal) {
      day.matchStatus = 'missing_personal'
      day.hasDifference = true
    } else if (official && personal) {
      // Both exist, check for differences
      const offClockIn = official.clock_in ? new Date(official.clock_in).getTime() : null
      const perClockIn = personal.clock_in ? new Date(personal.clock_in).getTime() : null
      const offClockOut = official.clock_out ? new Date(official.clock_out).getTime() : null
      const perClockOut = personal.clock_out ? new Date(personal.clock_out).getTime() : null

      const clockInDiff = offClockIn && perClockIn ? offClockIn - perClockIn : null
      const clockOutDiff = offClockOut && perClockOut ? offClockOut - perClockOut : null
      const hoursDiff = official.total_hours && personal.total_hours 
        ? official.total_hours - personal.total_hours 
        : null

      const hasClockInDiff = clockInDiff !== null && Math.abs(clockInDiff) > 60000 // 1 minute threshold
      const hasClockOutDiff = clockOutDiff !== null && Math.abs(clockOutDiff) > 60000
      const hasHoursDiff = hoursDiff !== null && Math.abs(hoursDiff) > 0.01

      day.hasDifference = hasClockInDiff || hasClockOutDiff || hasHoursDiff
      day.matchStatus = day.hasDifference ? 'partial_match' : 'match'
      
      if (day.hasDifference) {
        day.differences = {
          clockInDiff: clockInDiff ? Math.round(clockInDiff / 60000) : null, // minutes
          clockOutDiff: clockOutDiff ? Math.round(clockOutDiff / 60000) : null, // minutes
          hoursDiff: hoursDiff,
        }
      }
    }
  })

  const comparison = Object.values(comparisonByDate).sort((a, b) => b.date.localeCompare(a.date))

  // Get summary stats
  const totalDays = comparison.length
  const daysWithDifference = comparison.filter(c => c.hasDifference).length
  const daysMatching = comparison.filter(c => c.matchStatus === 'match').length
  const missingOfficial = comparison.filter(c => c.matchStatus === 'missing_official').length
  const missingPersonal = comparison.filter(c => c.matchStatus === 'missing_personal').length

  return NextResponse.json({
    comparison,
    summary: {
      totalDays,
      daysWithDifference,
      daysMatching,
      missingOfficial,
      missingPersonal,
      differencePercentage: totalDays > 0 ? Math.round((daysWithDifference / totalDays) * 100) : 0,
    },
  })
}
