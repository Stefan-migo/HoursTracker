import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)

    if (error) {
      console.error('Error checking admin existence:', error)
      return NextResponse.json({ adminExists: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ adminExists: !!data && data.length > 0 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ adminExists: false }, { status: 500 })
  }
}
