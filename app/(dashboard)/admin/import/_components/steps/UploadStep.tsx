'use client'

import { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet, FileText, X } from 'lucide-react'
import { ParserFactory } from '@/lib/parsers/ParserFactory'
import { ColumnDetector } from '@/lib/detectors/ColumnDetector'
import type { UseImportWizardReturn } from '@/lib/hooks/useImportWizard'

interface UploadStepProps {
  wizard: UseImportWizardReturn
}

export function UploadStep({ wizard }: UploadStepProps) {
  const { state, setFile, setFileData, setColumnMapping, setLoading, setError } = wizard

  const processFile = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const parser = ParserFactory.getParser(file)
      const buffer = await file.arrayBuffer()
      const result = await parser.parse(Buffer.from(buffer))

      setFile(file)
      setFileData({
        headers: result.headers,
        rows: result.rows,
        totalRows: result.totalRows
      })

      // Auto-detect column mappings
      const mappings = ColumnDetector.detectColumns(result.headers, result.rows.slice(0, 10))
      setColumnMapping(mappings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo')
      setFile(null)
      setFileData(null)
    } finally {
      setLoading(false)
    }
  }, [setFile, setFileData, setColumnMapping, setLoading, setError])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      processFile(droppedFile)
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }, [processFile])

  const clearFile = useCallback(() => {
    setFile(null)
    setFileData(null)
    setColumnMapping([])
  }, [setFile, setFileData, setColumnMapping])

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.csv')) return <FileText className="h-8 w-8 text-success" />
    return <FileSpreadsheet className="h-8 w-8 text-success" />
  }

  return (
    <Card className="bg-background border-border">
      <CardContent className="p-6">
        {!state.file ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="
              border-2 border-dashed border-border rounded-xl p-12 text-center
              hover:border-accent/50 hover:bg-accent/5 transition-all duration-200
              cursor-pointer
            "
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-accent/70" />
            <h3 className="text-lg font-medium mb-2">
              Arrastra y suelta tu archivo aquí
            </h3>
            <p className="text-sm text-foreground-secondary mb-4">
              o haz clic para seleccionar un archivo
            </p>
            <div className="text-xs text-foreground-secondary space-y-1">
              <p>Formatos soportados: Excel (.xlsx, .xls), CSV (.csv)</p>
              <p>Tamaño máximo: 10 MB</p>
            </div>
            <input
              type="file"
              accept={ParserFactory.getAcceptedFileTypes()}
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input">
              <Button variant="outline" className="mt-4 border-border cursor-pointer" asChild>
                <span>Seleccionar archivo</span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-background-secondary rounded-lg border border-border">
              <div className="flex items-center gap-3">
                {getFileIcon(state.file.name)}
                <div>
                  <p className="font-medium">{state.file.name}</p>
                  <p className="text-sm text-foreground-secondary">
                    {(state.file.size / 1024 / 1024).toFixed(2)} MB
                    {state.fileData && ` • ${state.fileData.totalRows} registros detectados`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                className="text-foreground-secondary hover:text-error"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {state.fileData && (
              <div className="p-4 bg-success-muted border border-success/20 rounded-lg">
                <p className="text-sm text-success">
                  <strong>✓ Archivo procesado correctamente</strong>
                </p>
                <p className="text-sm text-success/80 mt-1">
                  Se detectaron {state.fileData.headers.length} columnas y {state.fileData.totalRows} registros.
                  Presiona &quot;Siguiente&quot; para continuar con el mapeo de columnas.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
