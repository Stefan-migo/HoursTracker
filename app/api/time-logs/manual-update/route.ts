import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request) {
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

  try {
    const body = await request.json()
    const { id, clockIn, clockOut, notes, reason } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de registro requerido' }, { status: 400 })
    }

    // Verificar que el registro existe y pertenece al usuario
    const { data: existingLog, error: fetchError } = await supabase
      .from('time_logs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingLog) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    // Construir objeto de actualización
    const updateData: Record<string, unknown> = {
      is_manual: true,
      updated_at: new Date().toISOString(),
    }

    // Helper to convert time to UTC
    const convertToUTC = (timeStr: string | undefined, dateStr: string): string | null => {
      if (!timeStr) return null
      
      // If it's a full ISO string (contains 'T'), parse normally
      if (timeStr.includes('T')) {
        return new Date(timeStr).toISOString()
      }
      
      // If it's just HH:MM, combine with the date
      const [hours, minutes] = timeStr.split(':')
      const localDateTime = new Date(`${dateStr}T${hours}:${minutes}:00`)
      return localDateTime.toISOString()
    }

    // Actualizar clock_in si se proporciona
    if (clockIn !== undefined) {
      const clockInUTC = convertToUTC(clockIn, existingLog.date)
      if (!clockInUTC) {
        return NextResponse.json({ error: 'Formato de hora de entrada inválido' }, { status: 400 })
      }
      updateData.clock_in = clockInUTC
    }

    // Actualizar clock_out si se proporciona
    if (clockOut !== undefined) {
      const clockOutUTC = convertToUTC(clockOut, existingLog.date)
      if (!clockOutUTC) {
        return NextResponse.json({ error: 'Formato de hora de salida inválido' }, { status: 400 })
      }
      updateData.clock_out = clockOutUTC
    }

    // Validar que entrada sea anterior a salida si ambos están presentes
    const finalClockIn = updateData.clock_in || existingLog.clock_in
    const finalClockOut = updateData.clock_out || existingLog.clock_out

    if (finalClockIn && finalClockOut) {
      const startTime = new Date(finalClockIn).getTime()
      const endTime = new Date(finalClockOut).getTime()

      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'La hora de salida debe ser posterior a la hora de entrada' },
          { status: 400 }
        )
      }

      // Calcular total_hours
      const diffMs = endTime - startTime
      const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
      
      // Validar límites (máximo 16 horas)
      if (totalHours > 16) {
        return NextResponse.json(
          { error: 'El máximo permitido es 16 horas por jornada' },
          { status: 400 }
        )
      }

      updateData.total_hours = totalHours
    }

    // Actualizar el registro
    const { data, error } = await supabase
      .from('time_logs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating time log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error processing manual update:', error)
    return NextResponse.json(
      { error: 'Error al procesar la actualización' },
      { status: 500 }
    )
  }
}
