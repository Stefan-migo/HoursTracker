import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSupabaseError } from '@/lib/supabase/errors'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      const { message, status } = handleSupabaseError(profileError)
      return NextResponse.json({ error: message }, { status })
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const { data: employees, error: employeesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, is_active, work_group_id')
      .eq('role', 'employee')
      .eq('is_active', true)
      .order('full_name')

    if (employeesError) {
      console.error('Employees fetch error:', employeesError)
      const { message, status } = handleSupabaseError(employeesError)
      return NextResponse.json({ error: message }, { status })
    }

    const { data: workGroups, error: groupsError } = await supabase
      .from('work_groups')
      .select('id, name, clock_in_time, clock_out_time')

    if (groupsError) {
      console.error('Work groups fetch error:', groupsError)
    }

    const workGroupsMap = new Map(
      workGroups?.map(g => [g.id, g]) || []
    )

    const { data: logs, error: logsError } = await supabase
      .from('time_logs')
      .select('id, user_id, date, clock_in, clock_out, total_hours')
      .eq('date', date)
      .eq('is_official', true)

    if (logsError) {
      console.error('Logs fetch error:', logsError)
    }

    const logsByUser = new Map(
      logs?.map(log => [log.user_id, log]) || []
    )

    const employeesWithStatus = employees?.map(employee => {
      const log = logsByUser.get(employee.id)
      return {
        ...employee,
        work_groups: employee.work_group_id ? workGroupsMap.get(employee.work_group_id) || null : null,
        today_log: log || null,
        is_present: !!log,
      }
    }) || []

    const activeCount = employeesWithStatus.filter(e => e.is_present).length
    const inactiveCount = employeesWithStatus.filter(e => !e.is_present).length
    const totalHours = logs?.reduce((sum, log) => sum + (log.total_hours || 0), 0) || 0

    return NextResponse.json({
      employees: employeesWithStatus,
      stats: {
        active: activeCount,
        inactive: inactiveCount,
        total_hours: Math.round(totalHours * 10) / 10,
      },
      date,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/dashboard:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
