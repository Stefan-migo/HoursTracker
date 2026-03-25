import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface TimeLogInput {
  email: string
  date: string
  clockIn: string
  clockOut: string
  row?: number
}

interface WorkerInput {
  email: string
  fullName: string
  sendInvitation: boolean
  rowNumbers: number[]
}

interface ImportRequest {
  records: TimeLogInput[]
  workers: WorkerInput[]
}

interface TimeLogRecord {
  user_id: string
  date: string
  clock_in: string
  clock_out: string
  total_hours: number
  is_official: boolean
  is_manual: boolean
  marked_by: string | null
}

async function checkAndCreateMediations(records: TimeLogRecord[], adminId: string) {
  const DISCREPANCY_THRESHOLD_MINUTES = 10
  const DISCREPANCY_THRESHOLD_HOURS = 0.17

  for (const record of records) {
    if (!record.is_official) continue

    const { data: personalLog } = await supabaseAdmin
      .from('time_logs')
      .select('*')
      .eq('user_id', record.user_id)
      .eq('date', record.date)
      .eq('is_official', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!personalLog) continue

    const officialClockIn = new Date(record.clock_in)
    const officialClockOut = new Date(record.clock_out)
    const personalClockIn = new Date(personalLog.clock_in)
    const personalClockOut = new Date(personalLog.clock_out)

    const clockInDiff = Math.abs((officialClockIn.getTime() - personalClockIn.getTime()) / (1000 * 60))
    const clockOutDiff = Math.abs((officialClockOut.getTime() - personalClockOut.getTime()) / (1000 * 60))
    const totalHoursDiff = Math.abs(record.total_hours - (personalLog.total_hours || 0))

    if (clockInDiff > DISCREPANCY_THRESHOLD_MINUTES ||
        clockOutDiff > DISCREPANCY_THRESHOLD_MINUTES ||
        totalHoursDiff > DISCREPANCY_THRESHOLD_HOURS) {

      const { data: existingMediation } = await supabaseAdmin
        .from('mediations')
        .select('id')
        .eq('employee_id', record.user_id)
        .eq('date', record.date)
        .eq('is_active', true)
        .in('status', ['pending_review', 'in_discussion', 'agreement_reached'])
        .limit(1)

      if (existingMediation) continue

      const { data: officialLog } = await supabaseAdmin
        .from('time_logs')
        .select('id')
        .eq('user_id', record.user_id)
        .eq('date', record.date)
        .eq('is_official', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!officialLog) continue

      const initialReason = `Discrepancia automática detectada: ${clockInDiff > DISCREPANCY_THRESHOLD_MINUTES ? `Entrada difiere en ${Math.round(clockInDiff)} minutos. ` : ''}${clockOutDiff > DISCREPANCY_THRESHOLD_MINUTES ? `Salida difiere en ${Math.round(clockOutDiff)} minutos. ` : ''}${totalHoursDiff > DISCREPANCY_THRESHOLD_HOURS ? `Total de horas difiere en ${totalHoursDiff.toFixed(2)} horas.` : ''}`

      const { error: mediationError } = await supabaseAdmin
        .from('mediations')
        .insert({
          employee_id: record.user_id,
          date: record.date,
          admin_time_log_id: officialLog.id,
          employee_time_log_id: personalLog.id,
          admin_clock_in_snap: record.clock_in,
          admin_clock_out_snap: record.clock_out,
          admin_total_hours_snap: record.total_hours,
          employee_clock_in_snap: personalLog.clock_in,
          employee_clock_out_snap: personalLog.clock_out,
          employee_total_hours_snap: personalLog.total_hours,
          initial_reason: initialReason,
          status: 'pending_review',
          admin_last_activity_at: new Date().toISOString(),
          last_activity_by: adminId,
          is_active: true
        })

      if (mediationError) {
        console.error('Error creating mediation:', mediationError)
      } else {
        await supabaseAdmin
          .from('time_logs')
          .update({ mediation_id: officialLog.id })
          .in('id', [officialLog.id, personalLog.id])
      }
    }
  }
}

export async function POST(request: Request) {
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
    const body: ImportRequest = await request.json()
    const { records, workers } = body

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const result = {
      imported: 0,
      failed: 0,
      skipped: 0,
      workersCreated: 0,
      invitationsSent: 0,
      errors: [] as { row: number; email: string; error: string }[]
    }

    // 1. Crear trabajadores nuevos si hay
    if (workers && workers.length > 0) {
      for (const emp of workers) {
        if (!emp.fullName?.trim()) continue

        try {
          // Verificar si ya existe el profile por email
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('email', emp.email.toLowerCase())
            .single()

          if (existingProfile) {
            continue // Ya existe, saltar
          }

          // Verificar si ya existe el usuario en auth.users
          const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
          const userExists = existingUser?.users.some(u => u.email === emp.email.toLowerCase())

          if (userExists) {
            // El usuario existe en auth.users pero no en profiles (inconsistente)
            // Crear profile manualmente
            const user = existingUser.users.find(u => u.email === emp.email.toLowerCase())
            if (user) {
              const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                  id: user.id,
                  email: emp.email.toLowerCase(),
                  full_name: emp.fullName.trim(),
                  role: 'employee',
                  is_active: true,
                  invitation_status: emp.sendInvitation ? 'active' : 'pending'
                })

              if (!profileError) {
                result.workersCreated++
                if (emp.sendInvitation) {
                  result.invitationsSent++
                }
              }
            }
            continue
          }

          // Crear usuario en auth.users
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: emp.email.toLowerCase(),
            email_confirm: true,
            user_metadata: {
              full_name: emp.fullName.trim()
            }
          })

          if (userError || !userData?.user) {
            console.error('Error creating auth user:', userError)
            continue
          }

          const newUserId = userData.user.id

          // El trigger on_auth_user_created debería haber creado el profile
          // Pero si falló, lo creamos manualmente
          const { data: triggerProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', newUserId)
            .single()

          if (!triggerProfile) {
            // El trigger no creó el profile, hacerlo manualmente
            const { error: manualProfileError } = await supabaseAdmin
              .from('profiles')
              .insert({
                id: newUserId,
                email: emp.email.toLowerCase(),
                full_name: emp.fullName.trim(),
                role: 'employee',
                is_active: true,
                invitation_status: emp.sendInvitation ? 'active' : 'pending'
              })

            if (manualProfileError) {
              console.error('Error creating profile manually:', manualProfileError)
              continue
            }
          } else {
            // El trigger creó el profile, actualizar con datos correctos
            await supabaseAdmin
              .from('profiles')
              .update({
                email: emp.email.toLowerCase(),
                full_name: emp.fullName.trim(),
                is_active: true,
                invitation_status: emp.sendInvitation ? 'active' : 'pending'
              })
              .eq('id', newUserId)
          }

          result.workersCreated++

          if (emp.sendInvitation) {
            result.invitationsSent++
          }
        } catch (empErr) {
          console.error('Error processing employee:', empErr)
        }
      }
    }

    // 2. Importar registros de tiempo
    const validRecords = records.filter(r => r.email && r.date && r.clockIn && r.clockOut)
    
    if (validRecords.length === 0) {
      return NextResponse.json({
        ...result,
        error: 'No hay registros válidos para importar'
      }, { status: 400 })
    }

    const emails = [...new Set(validRecords.map(l => l.email.toLowerCase()))]

    // Obtener perfiles por email usando admin client para bypass RLS
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .in('email', emails)

    const emailToId = new Map(
      profiles?.map(p => [p.email.toLowerCase(), p.id]) || []
    )

    // Filtrar solo registros con perfil existente
    const recordsWithProfile = validRecords.filter(log => 
      emailToId.has(log.email.toLowerCase())
    )

    if (recordsWithProfile.length === 0) {
      return NextResponse.json({
        ...result,
        failed: validRecords.length,
        error: 'No se encontraron usuarios con los emails proporcionados'
      })
    }

    // Obtener registros oficiales existentes para evitar duplicados
    const userIds = [...new Set(recordsWithProfile.map(l => emailToId.get(l.email.toLowerCase())))]
    const dates = [...new Set(recordsWithProfile.map(l => l.date))]

    const { data: existingOfficialLogs } = await supabase
      .from('time_logs')
      .select('user_id, date')
      .in('user_id', userIds)
      .in('date', dates)
      .eq('is_official', true)

    const existingKeys = new Set(
      existingOfficialLogs?.map(log => `${log.user_id}-${log.date}`) || []
    )

    // Preparar registros para insertar
    const recordsToInsert = recordsWithProfile
      .filter(log => {
        const userId = emailToId.get(log.email.toLowerCase())!
        const key = `${userId}-${log.date}`
        return !existingKeys.has(key)
      })
      .map(log => {
        const userId = emailToId.get(log.email.toLowerCase())!
        const clockInDate = log.clockIn.includes('T') 
          ? log.clockIn 
          : `${log.date}T${log.clockIn}:00`
        const clockOutDate = log.clockOut.includes('T') 
          ? log.clockOut 
          : `${log.date}T${log.clockOut}:00`
        
        let hoursDiff = 0
        try {
          hoursDiff = (new Date(clockOutDate).getTime() - new Date(clockInDate).getTime()) / (1000 * 60 * 60)
        } catch {
          hoursDiff = 0
        }

        return {
          user_id: userId,
          date: log.date,
          clock_in: clockInDate,
          clock_out: clockOutDate,
          total_hours: Math.round(hoursDiff * 100) / 100,
          is_official: true,
          is_manual: false,
          marked_by: user?.id
        }
      })

    result.skipped = validRecords.length - recordsToInsert.length - (validRecords.length - recordsWithProfile.length)
    result.failed = validRecords.length - recordsToInsert.length - result.skipped

    if (recordsToInsert.length > 0) {
      // Usar la función RPC para insertar registros oficiales (bypasses trigger)
      const { error: insertError } = await supabaseAdmin.rpc(
        'insert_official_time_logs',
        { time_logs_array: recordsToInsert }
      )

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json({
          ...result,
          imported: 0,
          failed: recordsToInsert.length,
          error: insertError.message
        }, { status: 500 })
      }

      result.imported = recordsToInsert.length

      // Check and create mediations for imported records
      await checkAndCreateMediations(recordsToInsert, user.id)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({
      imported: 0,
      failed: 0,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
