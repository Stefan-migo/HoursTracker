import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const employeeId = searchParams.get('employee_id')
    const showOnlyDifferences = searchParams.get('show_only_differences') !== 'false' // Default: true

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Determine target user and check permissions
    let targetUserId = user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    if (isAdmin && employeeId) {
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
        edited_at,
        edit_reason,
        profiles!time_logs_marked_by_fkey(
          full_name
        )
      `)
      .eq('user_id', targetUserId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching time logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[Comparison API] Found ${logs?.length || 0} time logs for user ${targetUserId} from ${start} to ${end}`)

    // Get active mediations for this user and date range
    const { data: mediations, error: mediationError } = await supabase
      .from('mediations')
      .select(`
        id,
        date,
        status,
        admin_time_log_id,
        employee_time_log_id,
        admin_last_activity_at,
        employee_last_activity_at,
        created_at
      `)
      .eq('employee_id', targetUserId)
      .eq('is_active', true)
      .gte('date', start)
      .lte('date', end)

    if (mediationError) {
      console.error('Error fetching mediations:', mediationError)
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
        edited_at: string | null
      } | null
      personal: {
        id: string
        clock_in: string | null
        clock_out: string | null
        total_hours: number | null
        marked_by: string | null
        edited_at: string | null
      } | null
      hasDifference: boolean
      differences: {
        clock_in_diff_minutes: number | null
        clock_out_diff_minutes: number | null
        hours_diff: number | null
      } | null
      matchStatus: 'match' | 'partial_match' | 'missing_official' | 'missing_personal'
      mediation: {
        id: string
        status: string
        is_stale: boolean
        last_activity_at: string
      } | null
    }> = {}

    interface TimeLog {
      id: string
      date: string
      clock_in: string | null
      clock_out: string | null
      total_hours: number | null
      is_official: boolean
      is_manual: boolean
      marked_by: string | null
      notes: string | null
      edited_at: string | null
      edit_reason: string | null
      profiles: Array<{ full_name: string | null }> | null
    }

    interface MediationData {
      id: string
      date: string
      status: string
      admin_time_log_id: string | null
      employee_time_log_id: string | null
      admin_last_activity_at: string | null
      employee_last_activity_at: string | null
      created_at: string
    }

    logs?.forEach((log: TimeLog) => {
      console.log(`[Comparison API] Processing log: date=${log.date}, is_official=${log.is_official}, clock_in=${log.clock_in}, clock_out=${log.clock_out}`)
      if (!comparisonByDate[log.date]) {
        comparisonByDate[log.date] = {
          date: log.date,
          official: null,
          personal: null,
          hasDifference: false,
          differences: null,
          matchStatus: 'missing_official',
          mediation: null,
        }
      }

      const entry = {
        id: log.id,
        clock_in: log.clock_in,
        clock_out: log.clock_out,
        total_hours: log.total_hours,
        marked_by: log.profiles?.[0]?.full_name || null,
        edited_at: log.edited_at,
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

      // Check if there's a mediation for this date
      const mediation = mediations?.find((m: MediationData) => m.date === day.date)
      if (mediation) {
        const now = new Date()
        const lastActivity = new Date(
          Math.max(
            new Date(mediation.created_at).getTime(),
            new Date(mediation.admin_last_activity_at || 0).getTime(),
            new Date(mediation.employee_last_activity_at || 0).getTime()
          )
        )
        const isStale = now.getTime() - lastActivity.getTime() > 48 * 60 * 60 * 1000

        day.mediation = {
          id: mediation.id,
          status: mediation.status,
          is_stale: isStale,
          last_activity_at: lastActivity.toISOString(),
        }
      }

      if (!official && !personal) {
        day.matchStatus = 'missing_official'
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
            clock_in_diff_minutes: clockInDiff ? Math.round(clockInDiff / 60000) : null, // minutes
            clock_out_diff_minutes: clockOutDiff ? Math.round(clockOutDiff / 60000) : null, // minutes
            hours_diff: hoursDiff,
          }
          console.log(`[Comparison API] Difference detected on ${day.date}: clockInDiff=${hasClockInDiff}, clockOutDiff=${hasClockOutDiff}, hoursDiff=${hasHoursDiff}`)
        }
      }
    })

    let comparison = Object.values(comparisonByDate).sort((a, b) => b.date.localeCompare(a.date))

    // Filter to show only differences if requested
    if (showOnlyDifferences) {
      comparison = comparison.filter(c => c.hasDifference)
    }

    // Get summary stats
    const totalDays = Object.keys(comparisonByDate).length
    const daysWithDifference = Object.values(comparisonByDate).filter(c => c.hasDifference).length
    const daysMatching = Object.values(comparisonByDate).filter(c => c.matchStatus === 'match').length
    const missingOfficial = Object.values(comparisonByDate).filter(c => c.matchStatus === 'missing_official').length
    const missingPersonal = Object.values(comparisonByDate).filter(c => c.matchStatus === 'missing_personal').length
    const daysWithMediation = comparison.filter(c => c.mediation !== null).length

    console.log(`[Comparison API] Returning ${comparison.length} differences out of ${totalDays} total days`)

    return NextResponse.json({
      comparison,
      summary: {
        totalDays,
        daysWithDifference,
        daysMatching,
        missingOfficial,
        missingPersonal,
        daysWithMediation,
        differencePercentage: totalDays > 0 ? Math.round((daysWithDifference / totalDays) * 100) : 0,
      },
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/mediations/comparison:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
