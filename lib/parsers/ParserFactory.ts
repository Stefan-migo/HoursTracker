import type { FileParser } from './types'
import { ExcelParser } from './ExcelParser'
import { CSVParser } from './CSVParser'

export class ParserFactory {
  private static parsers: FileParser[] = [
    new ExcelParser(),
    new CSVParser()
  ]

  static getParser(file: File): FileParser {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    // Buscar por extensión primero
    let parser = this.parsers.find(p => 
      p.supportedExtensions.includes(extension)
    )
    
    // Si no se encuentra, buscar por MIME type
    if (!parser) {
      parser = this.parsers.find(p => 
        p.supportedFormats.includes(file.type)
      )
    }
    
    if (!parser) {
      throw new Error(`Formato de archivo no soportado: ${extension || file.type}`)
    }
    
    return parser
  }

  static getSupportedExtensions(): string[] {
    return this.parsers.flatMap(p => p.supportedExtensions)
  }

  static getAcceptedFileTypes(): string {
    return this.parsers.flatMap(p => p.supportedExtensions).join(',')
  }
}
