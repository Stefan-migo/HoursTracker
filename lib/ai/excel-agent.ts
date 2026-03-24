import * as XLSX from 'xlsx'

export interface ExcelAnalysis {
  columns: {
    detected: string[]
    mapping: Record<string, string>
    confidence: Record<string, number>
  }
  rows: {
    row: number
    data: Record<string, string>
    isValid: boolean
    errors: string[]
  }[]
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    suggestedEmails: string[]
  }
  recommendations: string[]
}

export async function analyzeExcelWithAI(file: File): Promise<ExcelAnalysis> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]
  
  if (jsonData.length === 0) {
    throw new Error('El archivo está vacío')
  }

  const headers = jsonData[0] as string[]
  const dataRows = jsonData.slice(1)

  const emailPatterns = ['email', 'correo', 'mail', 'e-mail']
  const datePatterns = ['fecha', 'date', 'día', 'dia']
  const clockInPatterns = ['entrada', 'clock_in', 'clock in', 'hora entrada', 'ingreso']
  const clockOutPatterns = ['salida', 'clock_out', 'clock out', 'hora salida', 'egreso']

  const autoMapping: Record<string, string> = {}
  const confidence: Record<string, number> = {}

  headers.forEach((header, index) => {
    const headerLower = String(header).toLowerCase().trim()
    
    if (emailPatterns.some(p => headerLower.includes(p))) {
      autoMapping[index.toString()] = 'email'
      confidence[index.toString()] = 0.95
    } else if (datePatterns.some(p => headerLower.includes(p))) {
      autoMapping[index.toString()] = 'date'
      confidence[index.toString()] = 0.9
    } else if (clockInPatterns.some(p => headerLower.includes(p))) {
      autoMapping[index.toString()] = 'clock_in'
      confidence[index.toString()] = 0.85
    } else if (clockOutPatterns.some(p => headerLower.includes(p))) {
      autoMapping[index.toString()] = 'clock_out'
      confidence[index.toString()] = 0.85
    } else {
      autoMapping[index.toString()] = 'unknown'
      confidence[index.toString()] = 0
    }
  })

  const processedRows = dataRows.map((row, index) => {
    const rowData: Record<string, string> = {}
    const errors: string[] = []

    headers.forEach((header, colIndex) => {
      const cellValue = row[colIndex]
      rowData[colIndex.toString()] = cellValue !== undefined ? String(cellValue) : ''
    })

    const emailCol = Object.entries(autoMapping).find(([_, v]) => v === 'email')?.[0]
    if (emailCol && rowData[emailCol]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(rowData[emailCol])) {
        errors.push('Email inválido')
      }
    }

    const dateCol = Object.entries(autoMapping).find(([_, v]) => v === 'date')?.[0]
    if (dateCol && rowData[dateCol]) {
      const dateValue = parseDate(rowData[dateCol])
      if (!dateValue) {
        errors.push('Fecha inválida')
      }
    }

    return {
      row: index + 2,
      data: rowData,
      isValid: errors.length === 0,
      errors,
    }
  })

  const suggestedEmails = processedRows
    .filter(r => r.data[Object.keys(autoMapping).find(k => autoMapping[k] === 'email') || ''])
    .map(r => {
      const emailCol = Object.keys(autoMapping).find(k => autoMapping[k] === 'email')
      return emailCol ? r.data[emailCol] : ''
    })
    .filter(e => e)
    .slice(0, 10)

  const recommendations: string[] = []

  const hasEmail = Object.values(autoMapping).includes('email')
  if (!hasEmail) {
    recommendations.push('No se detectó columna de email. Busca columnas como: "Email", "Correo", "Mail"')
  }

  const hasDate = Object.values(autoMapping).includes('date')
  if (!hasDate) {
    recommendations.push('No se detectó columna de fecha. Busca columnas como: "Fecha", "Date", "Día"')
  }

  const hasClockIn = Object.values(autoMapping).includes('clock_in')
  if (!hasClockIn) {
    recommendations.push('No se detectó columna de hora de entrada. Busca: "Entrada", "Hora Entrada", "Clock In"')
  }

  const hasClockOut = Object.values(autoMapping).includes('clock_out')
  if (!hasClockOut) {
    recommendations.push('No se detectó columna de hora de salida. Busca: "Salida", "Hora Salida", "Clock Out"')
  }

  if (processedRows.some(r => !r.isValid)) {
    recommendations.push(`Hay ${processedRows.filter(r => !r.isValid).length} filas con errores que necesitan revisión`)
  }

  return {
    columns: {
      detected: headers.map(String),
      mapping: autoMapping,
      confidence,
    },
    rows: processedRows,
    summary: {
      totalRows: dataRows.length,
      validRows: processedRows.filter(r => r.isValid).length,
      invalidRows: processedRows.filter(r => !r.isValid).length,
      suggestedEmails,
    },
    recommendations,
  }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  try {
    if (typeof dateStr === 'object') {
      const d = new Date(dateStr as unknown as string)
      return isNaN(d.getTime()) ? null : d
    }
  } catch {
    // ignore
  }

  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      const [, a, b, c] = match
      let year, month, day

      if (format === formats[0]) {
        year = parseInt(a)
        month = parseInt(b) - 1
        day = parseInt(c)
      } else {
        day = parseInt(a)
        month = parseInt(b) - 1
        year = parseInt(c)
      }

      const date = new Date(year, month, day)
      if (!isNaN(date.getTime())) return date
    }
  }

  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

export function generateSystemPrompt(analysis: ExcelAnalysis): string {
  return `Eres un asistente experto en análisis de datos de hojas de cálculo Excel para un sistema de registro de horas de empleados.

El usuario ha subido un archivo Excel que contiene registros de horas trabajadas. Tu tarea es analizar el archivo y proporcionar recomendaciones de mapeo de columnas.

## Columnas Detectadas:
${analysis.columns.detected.map((h, i) => `  ${i}: "${h}"`).join('\n')}

## Mapeo Automático (confianza):
${Object.entries(analysis.columns.mapping)
  .filter(([_, v]) => v !== 'unknown')
  .map(([k, v]) => `  Columna "${analysis.columns.detected[parseInt(k)]}" -> ${v} (${Math.round((analysis.columns.confidence[k] || 0) * 100)}%)`)
  .join('\n')}

## Resumen del Archivo:
- Total de filas: ${analysis.summary.totalRows}
- Filas válidas: ${analysis.summary.validRows}
- Filas con errores: ${analysis.summary.invalidRows}

## Recomendaciones:
${analysis.recommendations.map(r => `- ${r}`).join('\n')}

## Tu tarea:
1. Analiza si el mapeo automático es correcto
2. Sugiere correcciones si hay errores
3. Recomienda cómo resolver las filas con errores
4. Proporciona un JSON con el mapeo corregido si es necesario

Responde en español de manera clara y útil.`
}

export async function callOpenRouterAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return JSON.stringify({
      error: 'API key no configurada',
      message: 'Por favor configura OPENROUTER_API_KEY en .env.local'
    })
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'HoursTracker',
    },
    body: JSON.stringify({
      model: 'openrouter/ai/mii-m3',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente experto en análisis de datos Excel y sistemas de registro de horas. Ayudas al usuario a mapear correctamente las columnas de sus archivos Excel.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error de OpenRouter: ${error}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}