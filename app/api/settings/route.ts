'use client'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  const settings: Record<string, any> = {}
  for (const row of data ?? []) {
    settings[row.key] = row.value
  }
  
  return NextResponse.json(settings)
}

export async function PUT(request: Request) {
  const supabase = createClient()
  const body = await request.json()
  
  const { key, value } = body
  
  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 })
  }
  
  const { data, error } = await supabase
    .from('settings')
    .update({ 
      value, 
      updated_at: new Date().toISOString() 
    })
    .eq('key', key)
    .select()
    .single()
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}
