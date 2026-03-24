import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EmployeeDashboardClient } from './employee-dashboard-client'

async function getUserData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    userName: profile?.full_name || null,
  }
}

export default async function EmployeePage() {
  const userData = await getUserData()

  if (!userData) {
    redirect('/login')
  }

  return (
    <EmployeeDashboardClient 
      userName={userData.userName}
    />
  )
}
