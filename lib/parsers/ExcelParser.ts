import * as XLSX from 'xlsx'
import type { FileParser, ParsedResult } from './types'

export class ExcelParser implements FileParser {
  supportedFormats = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  supportedExtensions = ['.xlsx', '.xls']

  async parse(buffer: Buffer): Promise<ParsedResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]
    
    if (jsonData.length === 0) {
      throw new Error('El archivo está vacío')
    }

    const headers = (jsonData[0] || []).map(h => String(h).trim())
    const rows = jsonData.slice(1).map((row, index) => {
      const rowData: Record<string, string> = {}
      headers.forEach((header, colIndex) => {
        const value = row[colIndex]
        rowData[header] = value !== undefined && value !== null ? String(value) : ''
      })
      return rowData
    }).filter(row => Object.values(row).some(v => v !== ''))

    return {
      headers,
      rows,
      totalRows: rows.length
    }
  }
}
