import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeExcelWithAI, generateSystemPrompt, callOpenRouterAI, type ExcelAnalysis } from '@/lib/ai/excel-agent'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden analizar archivos' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json({ error: 'Tipo de archivo no válido. Solo se aceptan archivos Excel (.xlsx, .xls)' }, { status: 400 })
    }

    // Analyze the Excel file
    const analysis = await analyzeExcelWithAI(file)

    // Optionally get AI recommendations
    let aiRecommendations = null
    const useAI = formData.get('use_ai') === 'true'
    
    if (useAI) {
      try {
        const prompt = generateSystemPrompt(analysis)
        aiRecommendations = await callOpenRouterAI(prompt)
      } catch (aiError) {
        console.error('Error calling AI:', aiError)
        // Continue without AI recommendations
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      aiRecommendations,
    })
  } catch (error) {
    console.error('Error analyzing Excel:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error al analizar el archivo'
    }, { status: 500 })
  }
}