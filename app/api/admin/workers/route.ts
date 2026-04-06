import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const putSchema = z.object({
  id: z.string().uuid('ID inválido'),
  full_name: z.string().min(1).max(100).optional(),
  email: z.string().email('Email inválido').optional(),
  role: z.enum(['admin', 'employee']).optional(),
  is_active: z.boolean().optional(),
  include_in_dashboard: z.boolean().optional(),
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') || 'all' // all, active, inactive
  const search = searchParams.get('search') || ''

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden ver trabajadores' }, { status: 403 })
  }

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (filter === 'active') {
    query = query.eq('is_active', true)
  } else if (filter === 'inactive') {
    query = query.eq('is_active', false)
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: employees, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(employees)
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo admins pueden modificar trabajadores' }, { status: 403 })
    }

    const body = await request.json()
    
    const validationResult = putSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { id, full_name, email, role, is_active, include_in_dashboard } = validationResult.data

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Prevent changing own role (can't demote yourself from admin)
    if (id === user.id && role !== undefined && role !== 'admin') {
      return NextResponse.json(
        { error: 'No puedes cambiar tu propio rol de administrador' },
        { status: 400 }
      )
    }

    const updateData: { full_name?: string; email?: string; role?: string; is_active?: boolean; include_in_dashboard?: boolean } = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (is_active !== undefined) updateData.is_active = is_active
    if (include_in_dashboard !== undefined) updateData.include_in_dashboard = include_in_dashboard

    // Validar y actualizar email en auth.users si es necesario
    if (email !== undefined) {
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(id)
      
      if (existingUser?.user) {
        const isPlaceholder = existingUser.user.email?.includes('placeholder.local')
        
        if (isPlaceholder) {
          // Verificar que el nuevo email no exista en auth
          const { data: usersList } = await supabaseAdmin.auth.admin.listUsers()
          const emailExists = usersList?.users.some(u => 
            u.email?.toLowerCase() === email.toLowerCase() && u.id !== id
          )
          
          if (emailExists) {
            return NextResponse.json({ 
              error: 'El email ya está en uso por otro usuario' 
            }, { status: 400 })
          }
          
          // Actualizar email en auth.users y confirmar email
          await supabaseAdmin.auth.admin.updateUserById(id, {
            email: email.toLowerCase(),
            email_confirm: true
          })
        }
      } else {
        // No existe en auth - verificar si el email ya existe
        const { data: usersList } = await supabaseAdmin.auth.admin.listUsers()
        const emailExists = usersList?.users.some(u => 
          u.email?.toLowerCase() === email.toLowerCase()
        )
        
        if (emailExists) {
          return NextResponse.json({ 
            error: 'El email ya está en uso por otro usuario' 
          }, { status: 400 })
        }
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/admin/workers:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden eliminar trabajadores' }, { status: 403 })
  }

  // Don't allow deleting self
  if (id === user.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
  }

  const { error } = await supabase.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
