import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeWithAI } from '@/lib/ai/import-agent'
import type { ImportAgentRequest } from '@/lib/ai/import-agent/types'

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
    return NextResponse.json({ error: 'Solo admins pueden usar el agente de importacion' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { headers, rows, options } = body as ImportAgentRequest

    console.log('[API /import-agent] Received headers:', headers?.length)
    console.log('[API /import-agent] Received rows:', rows?.length)

    if (!headers || !rows) {
      return NextResponse.json({ error: 'Headers and rows are required' }, { status: 400 })
    }

    const importRequest: ImportAgentRequest = {
      headers,
      rows: rows.slice(0, 100),
      options: options || { skipEmptyHours: true, validateEmail: true }
    }

    const result = await analyzeWithAI(importRequest)

    console.log('[API /import-agent] Format type:', result.format?.type)
    console.log('[API /import-agent] Column mappings:', result.columnMappings?.length)
    console.log('[API /import-agent] Transformed records:', result.transformedRecords?.length)
    console.log('[API /import-agent] Success:', result.success)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Import agent error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error al procesar el archivo'
    }, { status: 500 })
  }
}
