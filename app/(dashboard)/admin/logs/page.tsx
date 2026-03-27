"use client"

import { Suspense, useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Select, SelectOption } from "@/components/ui/select"
import { ViewToggle } from "@/components/features/admin/logs/view-toggle"
import { CardsView } from "@/components/features/admin/logs/cards-view"
import {
  Info,
  Clock as ClockIcon,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Download,
  CheckSquare,
  Square,
  Trash,
  LogIn,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { formatTime, formatDate, formatHours, calculateTotalHours } from "@/lib/utils"
import { format } from "date-fns"
import * as XLSX from "xlsx"

interface TimeLogWithProfile {
  id: string
  date: string
  clock_in: string
  clock_out: string | null
  total_hours: number | null
  is_official: boolean
  user_id: string
  profiles: {
    id: string
    full_name: string
    email: string
  }
}

interface Employee {
  id: string
  full_name: string
  email: string
  is_active: boolean
}

interface EmployeeStats {
  user_id: string
  full_name: string
  email: string
  total_hours: number
  record_count: number
  average_hours: number
  compliance_percent: number
}

interface PaginationInfo {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

type ViewMode = "cards" | "table"

const DEFAULT_PAGE_SIZE = 20

function AdminLogsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [logs, setLogs] = useState<TimeLogWithProfile[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  })
  const [employeeFilter, setEmployeeFilter] = useState<string>("")
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<TimeLogWithProfile | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBulkClockModal, setShowBulkClockModal] = useState(false)
  const [bulkClockAction, setBulkClockAction] = useState<"clock_in" | "clock_out" | "both">("clock_in")
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [bulkClockForm, setBulkClockForm] = useState({
    date: new Date().toISOString().split("T")[0],
    time: "09:00",
    clockOut: "18:00",
  })
  const [showAddMenu, setShowAddMenu] = useState(false)

  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
  })

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const view = searchParams.get("view")
    return view === "table" ? "table" : "cards"
  })

  const [formData, setFormData] = useState({
    user_id: "",
    date: new Date().toISOString().split("T")[0],
    clock_in: "09:00",
    clock_out: "18:00",
    notes: "",
  })

  useEffect(() => {
    const view = searchParams.get("view")
    setViewMode(view === "table" ? "table" : "cards")
  }, [searchParams])

  useEffect(() => {
    fetchLogs()
    fetchEmployees()
    fetchEmployeeStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, employeeFilter, pagination.page, pagination.pageSize])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest(".add-menu-container")) {
        setShowAddMenu(false)
      }
    }

    if (showAddMenu) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showAddMenu])

  const handleViewChange = useCallback(
    (view: ViewMode) => {
      setViewMode(view)
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", view)
      router.push(`/admin/logs?${params.toString()}`, { scroll: false })
      setPagination((prev) => ({ ...prev, page: 1 }))
    },
    [router, searchParams]
  )

  async function fetchLogs() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("limit", String(pagination.pageSize))
      params.append("offset", String((pagination.page - 1) * pagination.pageSize))

      if (dateRange.start) {
        params.append("start_date", format(dateRange.start, "yyyy-MM-dd"))
      }
      if (dateRange.end) {
        params.append("end_date", format(dateRange.end, "yyyy-MM-dd"))
      }
      if (employeeFilter) {
        params.append("user_id", employeeFilter)
      }
      if (search.trim()) {
        params.append("search", search.trim())
      }

      const res = await fetch(`/api/admin/logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.data || [])
        setPagination((prev) => ({
          ...prev,
          totalItems: data.count || 0,
          totalPages: Math.ceil((data.count || 0) / pagination.pageSize),
        }))
        setSelectedLogs(new Set())
      }
    } catch (err) {
      console.error("Error fetching logs:", err)
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch("/api/admin/workers")
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.filter((e: Employee) => e.is_active !== false))
      }
    } catch (err) {
      console.error("Error fetching employees:", err)
    }
  }

  async function fetchEmployeeStats() {
    if (viewMode !== "cards") return

    try {
      const params = new URLSearchParams()
      if (dateRange.start) {
        params.append("start_date", format(dateRange.start, "yyyy-MM-dd"))
      }
      if (dateRange.end) {
        params.append("end_date", format(dateRange.end, "yyyy-MM-dd"))
      }
      if (employeeFilter) {
        params.append("user_id", employeeFilter)
      }

      const res = await fetch(`/api/admin/logs/aggregations?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEmployeeStats(data.data || [])
      }
    } catch (err) {
      console.error("Error fetching employee stats:", err)
    }
  }

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs
    const searchLower = search.toLowerCase()
    return logs.filter(
      (log) =>
        log.profiles.full_name.toLowerCase().includes(searchLower) ||
        log.profiles.email.toLowerCase().includes(searchLower)
    )
  }, [logs, search])

  const getTotalHours = useCallback((log: TimeLogWithProfile): number | null => {
    if (log.total_hours !== null && log.total_hours !== undefined) {
      return log.total_hours
    }
    if (log.clock_in && log.clock_out) {
      return calculateTotalHours(log.clock_in, log.clock_out)
    }
    return null
  }, [])

  const openNewOfficialModal = useCallback(() => {
    setEditingLog(null)
    setFormData({
      user_id: employees[0]?.id || "",
      date: new Date().toISOString().split("T")[0],
      clock_in: "09:00",
      clock_out: "18:00",
      notes: "",
    })
    setError(null)
    setShowModal(true)
  }, [employees])

  const openEditModal = useCallback((log: TimeLogWithProfile) => {
    setEditingLog(log)
    const clockInTime = log.clock_in
      ? new Date(log.clock_in).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "09:00"
    const clockOutTime = log.clock_out
      ? new Date(log.clock_out).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "18:00"
    setFormData({
      user_id: log.profiles.id,
      date: log.date,
      clock_in: clockInTime,
      clock_out: clockOutTime,
      notes: "",
    })
    setError(null)
    setShowModal(true)
  }, [])

  const handleLogEditFromCard = useCallback((log: {
    id: string
    date: string
    clock_in: string
    clock_out: string | null
    total_hours?: number | null
    is_official?: boolean
    user_id: string
    profiles: { id: string; full_name: string; email: string }
  }) => {
    const fullLog: TimeLogWithProfile = {
      id: log.id,
      date: log.date,
      clock_in: log.clock_in,
      clock_out: log.clock_out,
      total_hours: log.total_hours ?? null,
      is_official: log.is_official ?? false,
      user_id: log.user_id,
      profiles: log.profiles,
    }
    openEditModal(fullLog)
  }, [openEditModal])

  const toggleLogSelection = useCallback((logId: string) => {
    setSelectedLogs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }, [])

  const toggleAllSelection = useCallback(() => {
    if (selectedLogs.size === filteredLogs.length) {
      setSelectedLogs(new Set())
    } else {
      setSelectedLogs(new Set(filteredLogs.map((log) => log.id)))
    }
  }, [selectedLogs.size, filteredLogs])

  async function handleBulkDelete() {
    if (selectedLogs.size === 0) return
    setActionLoading("bulk-delete")
    try {
      const res = await fetch("/api/admin/logs/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedLogs) }),
      })
      if (res.ok) {
        setSelectedLogs(new Set())
        setShowDeleteConfirm(false)
        await fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Error al eliminar registros")
      }
    } catch {
      alert("Error al eliminar registros")
    } finally {
      setActionLoading(null)
    }
  }

  function exportToExcel() {
    const dataToExport = filteredLogs.map((log) => ({
      Trabajador: log.profiles.full_name,
      Email: log.profiles.email,
      Fecha: formatDate(log.date),
      Entrada: log.clock_in ? formatTime(log.clock_in) : "-",
      Salida: log.clock_out ? formatTime(log.clock_out) : "-",
      "Total Horas": formatHours(getTotalHours(log)),
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Registros")

    const dateStr = format(new Date(), "yyyy-MM-dd")
    XLSX.writeFile(wb, `registros-oficiales-${dateStr}.xlsx`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading("submitting")
    setError(null)

    try {
      const clockInFull = `${formData.date}T${formData.clock_in}:00`
      const clockOutFull = formData.clock_out
        ? `${formData.date}T${formData.clock_out}:00`
        : null

      if (editingLog) {
        const res = await fetch(`/api/admin/logs?id=${editingLog.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: formData.date,
            clock_in: clockInFull,
            clock_out: clockOutFull,
            notes: formData.notes || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Error al actualizar")
          setActionLoading(null)
          return
        }
        setLogsRefreshKey((k) => k + 1)
      } else {
        const res = await fetch("/api/admin/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: formData.user_id,
            date: formData.date,
            clock_in: clockInFull,
            clock_out: clockOutFull,
            notes: formData.notes || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Error al crear")
          setActionLoading(null)
          return
        }
      }

      setShowModal(false)
      await fetchLogs()
    } catch {
      setError("Error inesperado")
    } finally {
      setActionLoading(null)
    }
  }

  const [logsRefreshKey, setLogsRefreshKey] = useState(0)

  async function handleBulkClockSubmit() {
    if (selectedEmployees.size === 0) {
      setError("Selecciona al menos un empleado")
      return
    }

    setActionLoading("bulk-clock")
    setError(null)

    try {
      const { createClient } = await import("@/lib/supabase/client-auth")
      const supabase = createClient()

      if (bulkClockAction === "both") {
        const selectedEmpIds = Array.from(selectedEmployees)
        const targetDate = bulkClockForm.date

        const { data: existingLogs } = await supabase
          .from("time_logs")
          .select("id, user_id")
          .in("user_id", selectedEmpIds)
          .eq("date", targetDate)
          .eq("is_official", true)

        const existingLogMap = new Map(
          existingLogs?.map((log) => [log.user_id, log.id]) || []
        )

        const results = await Promise.allSettled(
          selectedEmpIds.map((empId) => {
            const existingLogId = existingLogMap.get(empId)
            const clockInFull = `${targetDate}T${bulkClockForm.time}:00`
            const clockOutFull = `${targetDate}T${bulkClockForm.clockOut}:00`

            if (existingLogId) {
              return fetch(`/api/admin/logs?id=${existingLogId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  clock_in: clockInFull,
                  clock_out: clockOutFull,
                }),
              })
            } else {
              return fetch("/api/admin/logs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: empId,
                  date: targetDate,
                  clock_in: clockInFull,
                  clock_out: clockOutFull,
                }),
              })
            }
          })
        )

        const failed = results.filter((r) => r.status === "rejected").length
        const succeeded = results.length - failed

        if (failed > 0) {
          setError(
            `${failed} operaciones fallaron. ${succeeded} completadas exitosamente.`
          )
        } else {
          setShowBulkClockModal(false)
          setSelectedEmployees(new Set())
          setSelectedLogs(new Set())
          await fetchLogs()
        }
      } else {
        const results = await Promise.allSettled(
          Array.from(selectedEmployees).map((empId) => {
            const body: Record<string, unknown> = {
              action: bulkClockAction,
              user_id: empId,
              is_manual: true,
              date: bulkClockForm.date,
            }

            if (bulkClockAction === "clock_in") {
              body.clock_in = `${bulkClockForm.date}T${bulkClockForm.time}:00`
            } else {
              body.clock_out = `${bulkClockForm.date}T${bulkClockForm.time}:00`
            }

            return fetch("/api/time-logs/clock", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          })
        )

        const failed = results.filter((r) => r.status === "rejected").length
        const succeeded = results.length - failed

        if (failed > 0) {
          setError(
            `${failed} operaciones fallaron. ${succeeded} completadas exitosamente.`
          )
        } else {
          setShowBulkClockModal(false)
          setSelectedEmployees(new Set())
          setSelectedLogs(new Set())
          await fetchLogs()
        }
      }
    } catch {
      setError("Error al procesar registros masivos")
    } finally {
      setActionLoading(null)
    }
  }

  const openBulkClockModal = useCallback(
    (action: "clock_in" | "clock_out" | "both") => {
      setBulkClockAction(action)
      setBulkClockForm({
        date: new Date().toISOString().split("T")[0],
        time: action === "clock_out" ? "18:00" : "09:00",
        clockOut: "18:00",
      })
      setSelectedEmployees(new Set())
      setError(null)
      setShowBulkClockModal(true)
    },
    []
  )

  const toggleEmployeeSelection = useCallback((empId: string) => {
    setSelectedEmployees((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(empId)) {
        newSet.delete(empId)
      } else {
        newSet.add(empId)
      }
      return newSet
    })
  }, [])

  const toggleAllEmployees = useCallback(() => {
    setSelectedEmployees((prev) => {
      if (prev.size === employees.length) {
        return new Set()
      } else {
        return new Set(employees.map((e) => e.id))
      }
    })
  }, [employees])

  async function handleDelete(log: TimeLogWithProfile) {
    if (
      !confirm(
        `Eliminar registro de ${log.profiles.full_name} del ${formatDate(log.date)}?`
      )
    )
      return
    setActionLoading(log.id)
    try {
      const res = await fetch(`/api/admin/logs?id=${log.id}`, { method: "DELETE" })
      if (res.ok) {
        await fetchLogs()
      } else {
        const data = await res.json()
        alert(data.error || "Error al eliminar")
      }
    } catch {
      alert("Error al eliminar")
    } finally {
      setActionLoading(null)
    }
  }

  const handleEmployeeCardClick = useCallback(
    (employeeId: string) => {
      setEmployeeFilter(employeeId)
      setViewMode("table")
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", "table")
      router.push(`/admin/logs?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }, [])

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registros Oficiales</h1>
          <p className="text-foreground-secondary">
            Gestionar registros de tiempo oficiales
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <div className="relative add-menu-container">
            <Button onClick={() => setShowAddMenu(!showAddMenu)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Registro
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
            {showAddMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-background border border-border rounded-lg shadow-lg z-50 py-1">
                <button
                  onClick={() => {
                    setShowAddMenu(false)
                    openNewOfficialModal()
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-background-secondary flex items-center gap-3 text-sm"
                >
                  <Plus className="h-4 w-4 text-accent" />
                  <div>
                    <div className="font-medium">Nuevo Registro</div>
                    <div className="text-xs text-foreground-secondary">
                      Crear un registro individual
                    </div>
                  </div>
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => {
                    setShowAddMenu(false)
                    openBulkClockModal("clock_in")
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-background-secondary flex items-center gap-3 text-sm"
                >
                  <LogIn className="h-4 w-4 text-success" />
                  <div>
                    <div className="font-medium">Entrada Masiva</div>
                    <div className="text-xs text-foreground-secondary">
                      Registrar entrada para múltiples trabajadores
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowAddMenu(false)
                    openBulkClockModal("clock_out")
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-background-secondary flex items-center gap-3 text-sm"
                >
                  <LogOut className="h-4 w-4 text-error" />
                  <div>
                    <div className="font-medium">Salida Masiva</div>
                    <div className="text-xs text-foreground-secondary">
                      Registrar salida para múltiples trabajadores
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowAddMenu(false)
                    openBulkClockModal("both")
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-background-secondary flex items-center gap-3 text-sm"
                >
                  <ClockIcon className="h-4 w-4 text-accent" />
                  <div>
                    <div className="font-medium">Registro Completo</div>
                    <div className="text-xs text-foreground-secondary">
                      Entrada y salida masiva
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-accent-muted/50 border border-accent/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-accent mt-0.5" />
          <div>
            <p className="text-sm text-foreground">
              <strong>Registros Oficiales:</strong> Estas viendo los registros
              oficiales del sistema.
            </p>
            <p className="text-sm text-foreground-secondary mt-1">
              Los trabajadores gestionan sus registros personales separadamente en
              su panel. Si notas discrepancias, revisa la seccion de Mediaciones.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Registros</CardTitle>
              <ViewToggle currentView={viewMode} onViewChange={handleViewChange} />
              {selectedLogs.size > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-accent-muted text-accent"
                >
                  {selectedLogs.size} seleccionados
                </Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <DateRangePicker
                startDate={dateRange.start}
                endDate={dateRange.end}
                onChange={(start, end) => {
                  setDateRange({ start, end })
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
              />

              <Select
                value={employeeFilter}
                onValueChange={(value) => {
                  setEmployeeFilter(value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
                className="w-full sm:w-48"
              >
                <SelectOption value="">Todos los trabajadores</SelectOption>
                {employees.map((emp) => (
                  <SelectOption key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectOption>
                ))}
              </Select>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-secondary" />
                <Input
                  placeholder="Buscar trabajador..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {selectedLogs.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={actionLoading === "bulk-delete"}
              >
                {actionLoading === "bulk-delete" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash className="h-4 w-4 mr-2" />
                )}
                Eliminar {selectedLogs.size} seleccionados
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLogs(new Set())}
              >
                Cancelar selección
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {viewMode === "cards" ? (
            <CardsView
              key={logsRefreshKey}
              employees={employeeStats}
              employeesList={employees}
              dateRange={dateRange}
              onEmployeeClick={handleEmployeeCardClick}
              onLogEdit={handleLogEditFromCard}
              onLogsRefresh={() => setLogsRefreshKey((k) => k + 1)}
              isLoading={isLoading}
            />
          ) : (
            <>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse bg-background-secondary rounded"
                    />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-foreground-secondary">
                  <ClockIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay registros oficiales</p>
                  <p className="text-sm mt-1">
                    Crea un nuevo registro oficial para comenzar
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <button
                              onClick={toggleAllSelection}
                              className="p-1 hover:bg-background-tertiary rounded"
                            >
                              {selectedLogs.size === filteredLogs.length ? (
                                <CheckSquare className="h-5 w-5 text-accent" />
                              ) : (
                                <Square className="h-5 w-5 text-foreground-secondary" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>Trabajador</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Entrada</TableHead>
                          <TableHead>Salida</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <button
                                onClick={() => toggleLogSelection(log.id)}
                                className="p-1 hover:bg-background-tertiary rounded"
                              >
                                {selectedLogs.has(log.id) ? (
                                  <CheckSquare className="h-5 w-5 text-accent" />
                                ) : (
                                  <Square className="h-5 w-5 text-foreground-secondary" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-foreground">
                                {log.profiles.full_name}
                              </div>
                              <div className="text-xs text-foreground-secondary">
                                {log.profiles.email}
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground">
                              {formatDate(log.date)}
                            </TableCell>
                            <TableCell className="text-success">
                              {formatTime(log.clock_in)}
                            </TableCell>
                            <TableCell className="text-error">
                              {formatTime(log.clock_out)}
                            </TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {formatHours(getTotalHours(log))}
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <div className="flex justify-end gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openEditModal(log)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Editar registro</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDelete(log)}
                                        disabled={actionLoading === log.id}
                                      >
                                        {actionLoading === log.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4 text-error" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Eliminar registro</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {pagination.totalPages > 1 && (
                    <div className="mt-4 border-t border-border pt-4">
                      <Pagination
                        currentPage={pagination.page}
                        pageSize={pagination.pageSize}
                        totalItems={pagination.totalItems}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLog ? "Editar Registro Oficial" : "Nuevo Registro Oficial"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-error-muted border border-error/20 rounded-lg text-error text-sm">
                {error}
              </div>
            )}

            {!editingLog && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Trabajador
                </label>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, user_id: value })
                  }
                  className="w-full"
                >
                  <SelectOption value="">Seleccionar trabajador</SelectOption>
                  {employees.map((emp) => (
                    <SelectOption key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.email})
                    </SelectOption>
                  ))}
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-success">Entrada</label>
                <Input
                  type="time"
                  value={formData.clock_in}
                  onChange={(e) =>
                    setFormData({ ...formData, clock_in: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-error">Salida</label>
                <Input
                  type="time"
                  value={formData.clock_out}
                  onChange={(e) =>
                    setFormData({ ...formData, clock_out: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Notas (opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-3 border border-border rounded-md bg-background text-foreground text-sm"
                rows={2}
                placeholder="Notas adicionales..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={actionLoading === "submitting"}
                className="flex-1"
              >
                {actionLoading === "submitting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingLog ? (
                  "Actualizar"
                ) : (
                  "Crear"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-error">
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-foreground">
              Estas a punto de eliminar{" "}
              <strong>{selectedLogs.size} registros</strong>.
            </p>
            <p className="text-foreground-secondary text-sm">
              Esta acción no se puede deshacer. Los registros seleccionados se
              eliminarán permanentemente.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={actionLoading === "bulk-delete"}
                className="flex-1"
              >
                {actionLoading === "bulk-delete" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash className="h-4 w-4 mr-2" />
                )}
                Eliminar {selectedLogs.size}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkClockModal} onOpenChange={setShowBulkClockModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle
              className={
                bulkClockAction === "clock_in"
                  ? "text-success"
                  : bulkClockAction === "clock_out"
                    ? "text-error"
                    : "text-accent"
              }
            >
              {bulkClockAction === "clock_in"
                ? "Registro Masivo de Entradas"
                : bulkClockAction === "clock_out"
                  ? "Registro Masivo de Salidas"
                  : "Registro Masivo Completo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-error-muted border border-error/20 rounded-lg text-error text-sm">
                {error}
              </div>
            )}

            <div
              className={bulkClockAction === "both" ? "space-y-4" : "grid grid-cols-2 gap-4"}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Fecha</label>
                <Input
                  type="date"
                  value={bulkClockForm.date}
                  onChange={(e) =>
                    setBulkClockForm({ ...bulkClockForm, date: e.target.value })
                  }
                />
              </div>
              {bulkClockAction === "both" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-success">
                        Hora de Entrada
                      </label>
                      <Input
                        type="time"
                        value={bulkClockForm.time}
                        onChange={(e) =>
                          setBulkClockForm({ ...bulkClockForm, time: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-error">
                        Hora de Salida
                      </label>
                      <Input
                        type="time"
                        value={bulkClockForm.clockOut || "18:00"}
                        onChange={(e) =>
                          setBulkClockForm({ ...bulkClockForm, clockOut: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label
                    className={`text-sm font-medium ${
                      bulkClockAction === "clock_in" ? "text-success" : "text-error"
                    }`}
                  >
                    {bulkClockAction === "clock_in"
                      ? "Hora de Entrada"
                      : "Hora de Salida"}
                  </label>
                  <Input
                    type="time"
                    value={bulkClockForm.time}
                    onChange={(e) =>
                      setBulkClockForm({ ...bulkClockForm, time: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Seleccionar Trabajadores
                </label>
                <Badge
                  variant="secondary"
                  className="bg-accent-muted text-accent"
                >
                  {selectedEmployees.size} seleccionados
                </Badge>
              </div>
              <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                {employees.length === 0 ? (
                  <div className="p-4 text-center text-foreground-secondary">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Cargando trabajadores...
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    <label className="flex items-center gap-3 p-3 bg-background-secondary hover:bg-background-tertiary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          selectedEmployees.size === employees.length &&
                          employees.length > 0
                        }
                        onChange={toggleAllEmployees}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-foreground">
                          Seleccionar todos
                        </span>
                        <span className="text-xs text-foreground-secondary ml-2">
                          ({selectedEmployees.size} de {employees.length})
                        </span>
                      </div>
                    </label>
                    {employees.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-3 p-3 hover:bg-background-secondary cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.has(emp.id)}
                          onChange={() => toggleEmployeeSelection(emp.id)}
                          className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {emp.full_name}
                          </div>
                          <div className="text-xs text-foreground-secondary">
                            {emp.email}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkClockModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBulkClockSubmit}
                disabled={
                  actionLoading === "bulk-clock" || selectedEmployees.size === 0
                }
                className={`flex-1 ${
                  bulkClockAction === "clock_in"
                    ? "bg-success hover:bg-success/80"
                    : bulkClockAction === "clock_out"
                      ? "bg-error hover:bg-error/80"
                      : "bg-accent hover:bg-accent/80"
                }`}
              >
                {actionLoading === "bulk-clock" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : bulkClockAction === "clock_in" ? (
                  <LogIn className="h-4 w-4 mr-2" />
                ) : bulkClockAction === "clock_out" ? (
                  <LogOut className="h-4 w-4 mr-2" />
                ) : (
                  <ClockIcon className="h-4 w-4 mr-2" />
                )}
                Registrar {selectedEmployees.size}{" "}
                {bulkClockAction === "clock_in"
                  ? "Entradas"
                  : bulkClockAction === "clock_out"
                    ? "Salidas"
                    : "Registros"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminLogsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="h-8 w-48 animate-pulse bg-background-secondary rounded" />
        <div className="h-32 animate-pulse bg-background-secondary rounded" />
        <div className="h-96 animate-pulse bg-background-secondary rounded" />
      </div>
    }>
      <AdminLogsContent />
    </Suspense>
  )
}
