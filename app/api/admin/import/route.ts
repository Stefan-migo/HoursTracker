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

interface EmployeeInput {
  email: string
  fullName: string
  sendInvitation: boolean
  rowNumbers: number[]
}

interface ImportRequest {
  records: TimeLogInput[]
  employees: EmployeeInput[]
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
    const { records, employees } = body

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const result = {
      imported: 0,
      failed: 0,
      skipped: 0,
      employeesCreated: 0,
      invitationsSent: 0,
      errors: [] as { row: number; email: string; error: string }[]
    }

    // 1. Crear empleados nuevos si hay
    if (employees && employees.length > 0) {
      for (const emp of employees) {
        if (!emp.fullName?.trim()) continue

        try {
          // Verificar si ya existe el profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
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
                  full_name: emp.fullName.trim(),
                  role: 'employee',
                  is_active: true,
                  invitation_status: emp.sendInvitation ? 'active' : 'pending'
                })

              if (!profileError) {
                result.employeesCreated++
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
                full_name: emp.fullName.trim(),
                is_active: true,
                invitation_status: emp.sendInvitation ? 'active' : 'pending'
              })
              .eq('id', newUserId)
          }

          result.employeesCreated++

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

    // Obtener perfiles por email
    const { data: profiles } = await supabase
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
        const clockInDate = `${log.date}T${log.clockIn}:00`
        const clockOutDate = `${log.date}T${log.clockOut}:00`
        
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
      // Usar admin client para bypass RLS
      const { error: insertError } = await supabaseAdmin
        .from('time_logs')
        .insert(recordsToInsert)

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
