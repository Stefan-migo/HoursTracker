import type { ImportAgentRequest, ImportAgentResponse, FormatDetection, ColumnMapping, TransformedRecord, TargetField } from './types'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt'
import { detectColumnType, detectDateFormat, detectTimeFormat, isValidEmail, normalizeEmail, createISOTimestamp } from './functions'
import { FormatDetector } from '@/lib/detectors/FormatDetector'
import { DataTransformer } from '@/lib/transformers/DataTransformer'
import type { FormatDetectionResult, TransformedRecord as BaseTransformedRecord } from '@/lib/transformers/types'
import { analyzeDataPatterns, parseCombinedTime } from './pattern-analyzer'
import { transformWithPatterns } from './universal-transformer'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const FREE_MODELS = [
  'meta-llama/llama-3-8b-instruct',
  'qwen/qwen2.5-72b-instruct:free',
  'google/gemini-2.0-flash-thinking-exp:free'
]

export async function analyzeWithAI(request: ImportAgentRequest): Promise<ImportAgentResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY
  
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return fallbackAnalysis(request)
  }

  const userPrompt = buildUserPrompt(request)

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'HoursTracker Import Agent',
      },
      body: JSON.stringify({
        model: FREE_MODELS[0],
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter API error:', response.status, errorText)
      return fallbackAnalysis(request)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.log('[AI Import Agent] No content from AI, using fallback')
      return fallbackAnalysis(request)
    }

    const parsed = parseAIResponse(content)
    console.log('[AI Import Agent] Parsed response:', parsed ? 'success' : 'null')
    
    if (!parsed) {
      console.log('[AI Import Agent] Parse failed, using fallback')
      return fallbackAnalysis(request)
    }

    return {
      success: true,
      format: parsed.format!,
      columnMappings: parsed.columnMappings!,
      transformedRecords: parsed.transformedRecords!,
      summary: parsed.summary!,
      recommendations: parsed.recommendations || []
    }
  } catch (error) {
    console.error('AI analysis error:', error)
    return fallbackAnalysis(request)
  }
}

function parseAIResponse(content: string): Partial<ImportAgentResponse> | null {
  try {
    let jsonStr = content
    
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    const startBracket = jsonStr.indexOf('{')
    const endBracket = jsonStr.lastIndexOf('}')
    
    if (startBracket === -1 || endBracket === -1) {
      return null
    }
    
    jsonStr = jsonStr.substring(startBracket, endBracket + 1)
    const parsed = JSON.parse(jsonStr)

    if (!parsed.format || !parsed.columnMappings || !parsed.transformedRecords) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function fallbackAnalysis(request: ImportAgentRequest): ImportAgentResponse {
  const { headers, rows, options } = request
  const sampleRows = rows.slice(0, 100)

  console.log('[AI Import Agent] Using NEW Intelligent Pattern-Based Fallback')

  // Use the new intelligent pattern analyzer
  const patterns = analyzeDataPatterns(headers, sampleRows)
  console.log('[AI Import Agent] Detected format type:', patterns.formatType)
  console.log('[AI Import Agent] Detected date columns:', patterns.dateColumns.length)
  console.log('[AI Import Agent] Has combined entry-exit:', patterns.hasCombinedEntryExit)

  let transformedRecords: TransformedRecord[] = []
  let errorMessage: string | undefined

  // Try intelligent transformation first
  if (patterns.formatType !== 'unknown' || patterns.dateColumns.length > 0) {
    try {
      transformedRecords = transformWithPatterns(headers, sampleRows, patterns, options)
      console.log('[AI Import Agent] Intelligent transform result:', transformedRecords.length, 'records')
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : 'Error in intelligent transform'
      console.error('[AI Import Agent] Intelligent transform error:', errorMessage)
    }
  }

  // If intelligent transform failed, try legacy detector
  if (transformedRecords.length === 0) {
    console.log('[AI Import Agent] Falling back to legacy FormatDetector')
    
    const detectedFormat = FormatDetector.detect(headers)
    console.log('[AI Import Agent] Legacy format detected:', detectedFormat.type, 'confidence:', detectedFormat.confidence)

    if (detectedFormat.type !== 'unknown' && detectedFormat.confidence >= 0.5) {
      try {
        const formatResult: FormatDetectionResult = {
          type: detectedFormat.type,
          confidence: detectedFormat.confidence,
          dateColumn: detectedFormat.dateColumn,
          clockInColumn: detectedFormat.clockInColumn,
          clockOutColumn: detectedFormat.clockOutColumn,
          dateColumns: detectedFormat.dateColumns,
          message: detectedFormat.message
        }
        
        if (detectedFormat.type === 'horizontal') {
          transformedRecords = transformHorizontal(headers, sampleRows, formatResult, options)
        } else {
          transformedRecords = transformVertical(headers, sampleRows, formatResult, options)
        }
      } catch (e) {
        errorMessage = e instanceof Error ? e.message : 'Error in legacy transform'
        console.error('[AI Import Agent] Legacy transform error:', errorMessage)
      }
    }
  }

  const columnMappings: ColumnMapping[] = headers.map(header => {
    const values = sampleRows.map(row => row[header] || '')
    const detectedType = detectColumnType(values)
    
    let targetField: TargetField | null = null
    let confidence = 30
    let reasoning = 'Low confidence - fallback analysis'

    const headerLower = header.toLowerCase()
    
    if (detectedType === 'email' || headerLower.includes('email') || headerLower.includes('correo')) {
      targetField = 'email'
      confidence = 90
      reasoning = 'Email column detected'
    } else if (headerLower.includes('nombre') || headerLower.includes('name') || headerLower.includes('colaborador') || headerLower.includes('empleado')) {
      targetField = 'full_name'
      confidence = 80
      reasoning = 'Name column detected'
    } else if (headerLower.includes('fecha') || headerLower.includes('date') || headerLower.includes('dia')) {
      targetField = 'date'
      confidence = 75
      reasoning = 'Date column detected'
    } else if (headerLower.includes('entrada') || headerLower.includes('in') || headerLower.includes('clock_in')) {
      targetField = 'clock_in'
      confidence = 75
      reasoning = 'Clock-in column detected'
    } else if (headerLower.includes('salida') || headerLower.includes('out') || headerLower.includes('clock_out')) {
      targetField = 'clock_out'
      confidence = 75
      reasoning = 'Clock-out column detected'
    }

    return {
      sourceColumn: header,
      targetField,
      confidence,
      sampleTransformed: values.find(v => v && v.trim()) || null,
      reasoning
    }
  })

  const validCount = transformedRecords.filter(r => r.isValid).length
  const invalidCount = transformedRecords.length - validCount

  // Use patterns from the intelligent analyzer, or create from legacy if needed
  const formatType = patterns.formatType !== 'unknown' ? patterns.formatType : 'horizontal'
  const formatConfidence = patterns.columns.length > 0 
    ? Math.max(...patterns.columns.map(c => c.confidence)) * 100 
    : 50

  const format: FormatDetection = {
    type: formatType,
    confidence: formatConfidence,
    reasoning: patterns.dateColumns.length > 0 
      ? `Detected ${patterns.formatType} format with ${patterns.dateColumns.length} date columns`
      : 'Using intelligent pattern-based detection'
  }

  return {
    success: true,
    format,
    columnMappings,
    transformedRecords,
    summary: {
      totalRows: rows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      issuesFound: invalidCount
    },
    recommendations: transformedRecords.length === 0 
      ? ['No se pudieron transformar registros. Verifica el formato del archivo.']
      : [],
    error: errorMessage
  }
}

function tryDetectHorizontalWithDayNames(headers: string[]): { datePairs: Array<{ date: string; dateNormalized: string; entradaColumn: string; salidaColumn: string }> } | null {
  const dayNames = ['lunes', 'martes', 'miercoles', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo', 'sabado', 'domingo']
  const datePattern = /(\d{1,2})[\/\-](\d{1,2})/
  
  const datePairs: Array<{ date: string; dateNormalized: string; entradaColumn: string; salidaColumn: string }> = []
  
  for (const header of headers) {
    const headerLower = header.toLowerCase()
    const isDayHeader = dayNames.some(d => headerLower.startsWith(d))
    const dateMatch = header.match(datePattern)
    
    if (isDayHeader && dateMatch) {
      const day = dateMatch[1]
      const month = dateMatch[2]
      const year = new Date().getFullYear()
      const normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      
      const hasInOut = headerLower.includes('(in-out)') || headerLower.includes('in-out')
      
      if (hasInOut) {
        const [inPart, outPart] = header.split(/[\(\)]/)[1]?.split('-') || []
        
        datePairs.push({
          date: `${day}/${month}/${year}`,
          dateNormalized: normalizedDate,
          entradaColumn: header,
          salidaColumn: header
        })
      }
    }
  }
  
  if (datePairs.length >= 2) {
    return { datePairs }
  }
  
  return null
}

function transformHorizontal(
  headers: string[], 
  rows: Record<string, string>[],
  format: FormatDetectionResult,
  options?: { validateEmail?: boolean; skipEmptyHours?: boolean }
): TransformedRecord[] {
  const result: TransformedRecord[] = []
  
  const emailCol = headers.find(h => 
    h.toLowerCase().includes('email') || 
    h.toLowerCase().includes('correo') ||
    h.toLowerCase().includes('mail')
  )
  const nameCol = headers.find(h => 
    h.toLowerCase().includes('nombre') || 
    h.toLowerCase().includes('name') ||
    h.toLowerCase().includes('colaborador') ||
    h.toLowerCase().includes('empleado')
  )

  if (!format.dateColumns || format.dateColumns.length === 0) {
    throw new Error('No se encontraron columnas de fecha para transformar')
  }

  for (const row of rows) {
    for (const datePair of format.dateColumns) {
      const entradaRaw = row[datePair.entradaColumn] || ''
      const salidaRaw = row[datePair.salidaColumn] || ''
      
      const email = emailCol ? row[emailCol] : ''
      const fullName = nameCol ? row[nameCol] : ''

      const recordIssues: string[] = []

      if (!entradaRaw && !salidaRaw) {
        if (options?.skipEmptyHours) continue
      }

      type TimeParseResult = { normalized?: string; confidence: number; format: string }
      let clockInResult: TimeParseResult = { confidence: 0, format: 'unknown' }
      let clockOutResult: TimeParseResult = { confidence: 0, format: 'unknown' }

      console.log('[DEBUG transformH] entradaColumn:', datePair.entradaColumn)
      console.log('[DEBUG transformH] salidaColumn:', datePair.salidaColumn)
      console.log('[DEBUG transformH] entradaRaw:', entradaRaw)
      console.log('[DEBUG transformH] salidaRaw:', salidaRaw)
      console.log('[DEBUG transformH] same column?', datePair.entradaColumn === datePair.salidaColumn)

      if (datePair.entradaColumn === datePair.salidaColumn) {
        const combinedValue = entradaRaw || salidaRaw
        console.log('[DEBUG transformH] combinedValue:', combinedValue)
        if (combinedValue) {
          const match = combinedValue.match(/(\d{1,2}:\d{2})\s*a\s*(\d{1,2}:\d{2})/i)
          console.log('[DEBUG transformH] match result:', match)
          if (match) {
            clockInResult = detectTimeFormat(match[1])
            clockOutResult = detectTimeFormat(match[2])
            console.log('[DEBUG transformH] clockIn from match:', match[1], '->', clockInResult)
            console.log('[DEBUG transformH] clockOut from match:', match[2], '->', clockOutResult)
          } else {
            const extracted = combinedValue.replace(/.*?(\d{2}:\d{2}).*/, '$1')
            console.log('[DEBUG transformH] regex fallback extracted:', extracted)
            clockInResult = detectTimeFormat(extracted)
          }
        }
      } else {
        const extractedIn = entradaRaw.replace(/.*?(\d{2}:\d{2}).*/, '$1')
        const extractedOut = salidaRaw.replace(/.*?(\d{2}:\d{2}).*/, '$1')
        console.log('[DEBUG transformH] extracted entrada:', extractedIn)
        console.log('[DEBUG transformH] extracted salida:', extractedOut)
        clockInResult = detectTimeFormat(extractedIn)
        clockOutResult = detectTimeFormat(extractedOut)
      }

      console.log('[DEBUG transformH] final clockInResult.normalized:', clockInResult.normalized)
      console.log('[DEBUG transformH] final clockOutResult.normalized:', clockOutResult.normalized)

      if (!clockInResult.normalized && entradaRaw) {
        recordIssues.push(`Invalid clock-in: ${entradaRaw}`)
      }
      if (!clockOutResult.normalized && salidaRaw) {
        recordIssues.push(`Invalid clock-out: ${salidaRaw}`)
      }

      if (options?.validateEmail !== false && email && !isValidEmail(email)) {
        recordIssues.push(`Invalid email: ${email}`)
      }

      if (clockInResult.normalized && clockOutResult.normalized) {
        const clockInISO = clockInResult.normalized.includes('T')
          ? clockInResult.normalized
          : `${datePair.dateNormalized}T${clockInResult.normalized}:00Z`
        const clockOutISO = clockOutResult.normalized.includes('T')
          ? clockOutResult.normalized
          : `${datePair.dateNormalized}T${clockOutResult.normalized}:00Z`
        
        console.log('[DEBUG transformH] clockInISO:', clockInISO)
        console.log('[DEBUG transformH] clockOutISO:', clockOutISO)
        
        result.push({
          email: email ? normalizeEmail(email) : '',
          fullName,
          date: datePair.dateNormalized,
          clockIn: clockInISO,
          clockOut: clockOutISO,
          isValid: recordIssues.length === 0,
          issues: recordIssues,
          rawData: row
        })
      } else if (entradaRaw || salidaRaw) {
        result.push({
          email: email ? normalizeEmail(email) : '',
          fullName,
          date: datePair.dateNormalized,
          clockIn: clockInResult.normalized 
            ? (clockInResult.normalized.includes('T') ? clockInResult.normalized : `${datePair.dateNormalized}T${clockInResult.normalized}:00Z`)
            : '',
          clockOut: clockOutResult.normalized 
            ? (clockOutResult.normalized.includes('T') ? clockOutResult.normalized : `${datePair.dateNormalized}T${clockOutResult.normalized}:00Z`)
            : '',
          isValid: false,
          issues: recordIssues,
          rawData: row
        })
      }
    }
  }

  return result
}

function transformVertical(
  headers: string[],
  rows: Record<string, string>[],
  format: FormatDetectionResult,
  options?: { validateEmail?: boolean; skipEmptyHours?: boolean }
): TransformedRecord[] {
  const result: TransformedRecord[] = []

  if (!format.dateColumn || !format.clockInColumn || !format.clockOutColumn) {
    throw new Error('No se encontraron todas las columnas necesarias')
  }

  const emailCol = headers.find(h => 
    h.toLowerCase().includes('email') || 
    h.toLowerCase().includes('correo') ||
    h.toLowerCase().includes('mail')
  )
  const nameCol = headers.find(h => 
    h.toLowerCase().includes('nombre') || 
    h.toLowerCase().includes('name') ||
    h.toLowerCase().includes('colaborador')
  )

  for (const row of rows) {
    const dateRaw = row[format.dateColumn!]
    const clockInRaw = row[format.clockInColumn!]
    const clockOutRaw = row[format.clockOutColumn!]
    const email = emailCol ? row[emailCol] : ''
    const fullName = nameCol ? row[nameCol] : ''

    const recordIssues: string[] = []

    if (!dateRaw && !clockInRaw && !clockOutRaw) {
      if (options?.skipEmptyHours) continue
    }

    const dateResult = detectDateFormat(dateRaw)
    const clockInResult = detectTimeFormat(clockInRaw)
    const clockOutResult = detectTimeFormat(clockOutRaw)

    if (!dateResult.normalized && dateRaw) {
      recordIssues.push(`Invalid date: ${dateRaw}`)
    }
    if (!clockInResult.normalized && clockInRaw) {
      recordIssues.push(`Invalid clock-in: ${clockInRaw}`)
    }
    if (!clockOutResult.normalized && clockOutRaw) {
      recordIssues.push(`Invalid clock-out: ${clockOutRaw}`)
    }
    if (options?.validateEmail !== false && email && !isValidEmail(email)) {
      recordIssues.push(`Invalid email: ${email}`)
    }

    const isValid = !!(recordIssues.length === 0 && !!dateResult.normalized && !!clockInResult.normalized && !!clockOutResult.normalized)

    if (dateResult.normalized && (clockInResult.normalized || clockOutResult.normalized)) {
      result.push({
        email: email ? normalizeEmail(email) : '',
        fullName,
        date: dateResult.normalized,
        clockIn: clockInResult.normalized ? `${dateResult.normalized}T${clockInResult.normalized}:00Z` : '',
        clockOut: clockOutResult.normalized ? `${dateResult.normalized}T${clockOutResult.normalized}:00Z` : '',
        isValid,
        issues: recordIssues,
        rawData: row
      })
    }
  }

  return result
}
