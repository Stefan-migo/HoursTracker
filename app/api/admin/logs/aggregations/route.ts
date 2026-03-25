import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { handleSupabaseError } from "@/lib/supabase/errors"
import { z } from "zod"

const querySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  user_id: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Profile fetch error:", profileError)
      const { message, status } = handleSupabaseError(profileError)
      return NextResponse.json({ error: message }, { status })
    }

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const queryParams = {
      start_date: searchParams.get("start_date") || undefined,
      end_date: searchParams.get("end_date") || undefined,
      user_id: searchParams.get("user_id") || undefined,
    }

    const validationResult = querySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Parámetros inválidos", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { start_date, end_date, user_id } = validationResult.data

    const DAILY_TARGET_HOURS = 8

    let query = supabase
      .from("time_logs")
      .select(
        `
        user_id,
        total_hours,
        profiles:user_id (
          full_name,
          email
        )
      `,
        { count: "exact" }
      )
      .eq("is_official", true)
      .order("date", { ascending: false })

    if (user_id) {
      query = query.eq("user_id", user_id)
    }

    if (start_date) {
      query = query.gte("date", start_date)
    }

    if (end_date) {
      query = query.lte("date", end_date)
    }

    const { data: logs, error: logsError } = await query

    if (logsError) {
      console.error("Error fetching logs for aggregations:", logsError)
      const { message, status } = handleSupabaseError(logsError)
      return NextResponse.json({ error: message }, { status })
    }

    console.log("Logs fetched for aggregations:", logs?.length)

    const employeeMap = new Map<
      string,
      {
        user_id: string
        full_name: string
        email: string
        total_hours: number
        record_count: number
        days_worked: number
      }
    >()

    for (const log of logs || []) {
      try {
        const userId = log.user_id
        const profileRaw = log.profiles as unknown
        const profile = Array.isArray(profileRaw) ? profileRaw[0] : (profileRaw as { full_name: string; email: string } | null)

        if (!employeeMap.has(userId)) {
          employeeMap.set(userId, {
            user_id: userId,
            full_name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            total_hours: 0,
            record_count: 0,
            days_worked: 0,
          })
        }

        const employee = employeeMap.get(userId)!
        employee.record_count++
        if (typeof log.total_hours === "number") {
          employee.total_hours += log.total_hours
        }
      } catch (err) {
        console.error("Error processing log:", log, err)
      }
    }

    const employeesWithStats = Array.from(employeeMap.values()).map((emp) => {
      const expectedHours = emp.record_count * DAILY_TARGET_HOURS
      const compliancePercent =
        expectedHours > 0 ? Math.round((emp.total_hours / expectedHours) * 100) : 0

      return {
        user_id: emp.user_id,
        full_name: emp.full_name,
        email: emp.email,
        total_hours: Math.round(emp.total_hours * 10) / 10,
        record_count: emp.record_count,
        average_hours: emp.record_count > 0
          ? Math.round((emp.total_hours / emp.record_count) * 10) / 10
          : 0,
        compliance_percent: Math.min(compliancePercent, 100),
      }
    })

    employeesWithStats.sort((a, b) => b.total_hours - a.total_hours)

    return NextResponse.json({
      data: employeesWithStats,
      count: employeesWithStats.length,
    })
  } catch (error) {
    console.error("Unexpected error in GET /api/admin/logs/aggregations:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
