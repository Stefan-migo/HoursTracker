export interface FileParser {
  supportedFormats: string[]
  supportedExtensions: string[]
  parse(file: Buffer): Promise<ParsedResult>
}

export interface ParsedResult {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
}
