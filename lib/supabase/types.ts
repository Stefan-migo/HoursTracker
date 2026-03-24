export type Profile = {
  id: string
  full_name: string
  role: 'worker' | 'admin'
  is_active: boolean
  email: string
  created_at: string
  updated_at: string
}

export type TimeLog = {
  id: string
  user_id: string
  date: string
  clock_in: string
  clock_out: string | null
  total_hours: number | null
  notes: string | null
  is_manual: boolean
  is_official: boolean
  marked_by: string | null
  record_type: 'official' | 'personal'
  created_at: string
  updated_at: string
}

export type TimeLogWithProfile = TimeLog & {
  profiles: {
    full_name: string
    email: string
  }
}

export type Dispute = {
  id: string
  employee_id: string
  date: string
  admin_clock_in: string | null
  admin_clock_out: string | null
  admin_total_hours: number | null
  employee_clock_in: string | null
  employee_clock_out: string | null
  employee_total_hours: number | null
  reason: string
  status: 'pending' | 'resolved' | 'rejected'
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type DisputeWithProfile = Dispute & {
  employee: {
    full_name: string
    email: string
  }
}

export type WorkerSummary = {
  user_id: string
  full_name: string
  total_hours: number
  days_worked: number
  week_start: string
}

export type MonthlyReport = {
  total_hours: number
  days_worked: number
  avg_hours: number
  expected_hours: number
}

export type WeekStats = {
  week_start: string
  week_end: string
  total_hours: number
  days_worked: number
  expected_hours: number
}

export type ApiError = {
  error: string
  details?: unknown
}

export type PaginatedResponse<T> = {
  data: T[]
  count: number
}
