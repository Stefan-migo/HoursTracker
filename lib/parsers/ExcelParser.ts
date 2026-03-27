import * as XLSX from 'xlsx'
import type { FileParser, ParsedResult } from './types'

function formatExcelDate(value: unknown): string {
  // Handle Date objects
  if (value instanceof Date) {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${monthNames[value.getMonth()]}-${String(value.getDate()).padStart(2, '0')}`
  }
  
  // Handle string values
  if (typeof value === 'string') {
    const strValue = value.trim()
    
    // Skip values that are clearly NOT dates (emails, text with @, etc)
    if (strValue.includes('@') || strValue.includes(' - ')) {
      return strValue
    }
    
    // Skip values that are just numbers or have unusual characters
    if (/^\d+\s*\(\w\)$/.test(strValue)) {
      // Like "1992 (M)" - birth year with gender
      return strValue
    }
    
    // Check if it's already a short format (Mar-16, Ene-15, etc)
    if (/^(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)-\d{1,2}$/i.test(strValue)) {
      return strValue
    }
    
    // Check for full date patterns before trying to parse
    if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Lun|Mar|Mié|Jue|Vie|Sáb|Dom)/i.test(strValue) ||
        /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(strValue)) {
      const date = new Date(strValue)
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        return `${monthNames[date.getMonth()]}-${String(date.getDate()).padStart(2, '0')}`
      }
    }
    
    return strValue
  }
  
  // Handle Excel date serial numbers
  if (typeof value === 'number') {
    if (value > 25569 && value < 60000) {
      const date = XLSX.SSF.parse_date_code(value)
      if (date) {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        return `${monthNames[date.m - 1]}-${String(date.d).padStart(2, '0')}`
      }
    }
  }
  
  return String(value)
}

export class ExcelParser implements FileParser {
  supportedFormats = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  supportedExtensions = ['.xlsx', '.xls']

  async parse(buffer: Buffer): Promise<ParsedResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][]
    
    if (jsonData.length === 0) {
      throw new Error('El archivo está vacío')
    }

    // Process headers - convert dates to short format (Mar-16)
    const headers = (jsonData[0] || []).map((h) => {
      const formatted = formatExcelDate(h)
      return formatted.trim()
    })

    const rows = jsonData.slice(1).map((row, rowIdx) => {
      const rowData: Record<string, string> = {}
      headers.forEach((header, colIndex) => {
        const rawValue = row[colIndex]
        const formatted = formatExcelDate(rawValue)
        rowData[header] = formatted
        console.log(`[ExcelParser] FINAL Row ${rowIdx}, Col ${colIndex} (${header}): raw="${rawValue}" formatted="${formatted}"`)
      })
      return rowData
    }).filter(row => Object.values(row).some(v => v !== ''))

    console.log('[ExcelParser] Headers after parsing:', headers)

    return {
      headers,
      rows,
      totalRows: rows.length
    }
  }
}
