"use client"

import * as React from "react"
import { Clock as ClockIcon, Loader2 } from "lucide-react"
import { EmployeeCard } from "./employee-card"
import { EmployeeSheet } from "./employee-sheet"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"

interface Employee {
  id: string
  full_name: string
  email: string
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

interface TimeLog {
  id: string
  date: string
  clock_in: string
  clock_out: string | null
  total_hours: number | null
  is_official: boolean
}

interface CardsViewProps {
  employees: EmployeeStats[]
  employeesList: Employee[]
  dateRange: { start: Date | null; end: Date | null }
  onEmployeeClick: (employeeId: string) => void
  onLogEdit?: (log: {
    id: string
    date: string
    clock_in: string
    clock_out: string | null
    total_hours?: number | null
    is_official?: boolean
    user_id: string
    profiles: { id: string; full_name: string; email: string }
  }) => void
  onLogsRefresh?: () => void
  isLoading?: boolean
}

export function CardsView({
  employees,
  employeesList,
  dateRange,
  onEmployeeClick,
  onLogEdit,
  onLogsRefresh,
  isLoading = false,
}: CardsViewProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null)
  const [selectedEmployeeLogs, setSelectedEmployeeLogs] = React.useState<TimeLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const selectedEmployee = React.useMemo(
    () => employees.find((e) => e.user_id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  )

  const fetchEmployeeLogs = React.useCallback(async (employeeId: string) => {
    setIsLoadingLogs(true)

    try {
      const params = new URLSearchParams()
      params.append("user_id", employeeId)
      if (dateRange.start) {
        params.append("start_date", dateRange.start.toISOString().split("T")[0])
      }
      if (dateRange.end) {
        params.append("end_date", dateRange.end.toISOString().split("T")[0])
      }

      const res = await fetch(`/api/admin/logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedEmployeeLogs(data.data || [])
      }
    } catch (err) {
      console.error("Error fetching employee logs:", err)
      setSelectedEmployeeLogs([])
    } finally {
      setIsLoadingLogs(false)
    }
  }, [dateRange])

  React.useEffect(() => {
    if (selectedEmployeeId && sheetOpen) {
      fetchEmployeeLogs(selectedEmployeeId)
    }
  }, [selectedEmployeeId, sheetOpen, fetchEmployeeLogs])

  const handleCardClick = async (employeeId: string) => {
    setSelectedEmployeeId(employeeId)
    setSheetOpen(true)
  }

  React.useEffect(() => {
    if (onLogsRefresh && selectedEmployeeId && sheetOpen) {
      fetchEmployeeLogs(selectedEmployeeId)
    }
  }, [onLogsRefresh, selectedEmployeeId, sheetOpen, fetchEmployeeLogs])

  const handleSheetClose = () => {
    setSheetOpen(false)
    setSelectedEmployeeId(null)
    setSelectedEmployeeLogs([])
  }

  const handleViewAll = () => {
    if (selectedEmployeeId) {
      onEmployeeClick(selectedEmployeeId)
      handleSheetClose()
    }
  }

  const handleViewInTable = (employeeId: string) => {
    handleSheetClose()
    onEmployeeClick(employeeId)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-lg bg-background-secondary"
          />
        ))}
      </div>
    )
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
        <ClockIcon className="h-12 w-12 text-foreground-secondary opacity-50" />
        <p className="mt-3 text-foreground-secondary">No hay datos para mostrar</p>
        <p className="text-sm text-foreground-secondary">
          Ajusta los filtros o espera a que hayan registros
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-foreground-secondary">
          {employees.length} empleado{employees.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success" />
            ≥90%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-warning" />
            70-89%
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-error" />
            &lt;70%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((employee) => (
          <EmployeeCard
            key={employee.user_id}
            employee={{
              id: employee.user_id,
              full_name: employee.full_name,
              email: employee.email,
            }}
            stats={{
              total_hours: employee.total_hours,
              record_count: employee.record_count,
              average_hours: employee.average_hours,
              compliance_percent: employee.compliance_percent,
            }}
            onClick={() => handleCardClick(employee.user_id)}
          />
        ))}
      </div>

      <EmployeeSheet
        employeeId={selectedEmployeeId}
        employeeName={selectedEmployee?.full_name || null}
        open={sheetOpen}
        onClose={handleSheetClose}
        dateRange={dateRange}
        logs={selectedEmployeeLogs}
        isLoading={isLoadingLogs}
        onViewAll={handleViewAll}
        onLogEdit={onLogEdit}
      />
    </>
  )
}
