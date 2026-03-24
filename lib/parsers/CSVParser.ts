import type { FileParser, ParsedResult } from './types'

export class CSVParser implements FileParser {
  supportedFormats = ['text/csv', 'application/csv']
  supportedExtensions = ['.csv', '.tsv']

  async parse(buffer: Buffer): Promise<ParsedResult> {
    const content = buffer.toString('utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length === 0) {
      throw new Error('El archivo está vacío')
    }

    // Detectar delimitador
    const firstLine = lines[0]
    const delimiter = firstLine.includes('\t') ? '\t' : ','

    const headers = this.parseLine(firstLine, delimiter)
    const rows = lines.slice(1).map(line => {
      const values = this.parseLine(line, delimiter)
      const rowData: Record<string, string> = {}
      headers.forEach((header, index) => {
        rowData[header] = values[index] || ''
      })
      return rowData
    }).filter(row => Object.values(row).some(v => v !== ''))

    return {
      headers,
      rows,
      totalRows: rows.length
    }
  }

  private parseLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }
}
