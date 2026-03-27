import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useMediationSettings() {
  const [mediationsEnabled, setMediationsEnabled] = useState<boolean | null>(null)
  const [mediationProcessEnabled, setMediationProcessEnabled] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    
    async function load() {
      const [visibilityResult, processResult] = await Promise.all([
        supabase
          .from('settings')
          .select('value')
          .eq('key', 'mediations_enabled')
          .single(),
        supabase
          .from('settings')
          .select('value')
          .eq('key', 'mediation_process_enabled')
          .single()
      ])
      
      if (!cancelled) {
        if (!visibilityResult.error && visibilityResult.data) {
          setMediationsEnabled(visibilityResult.data.value?.enabled ?? false)
        } else {
          setMediationsEnabled(false)
        }
        
        if (!processResult.error && processResult.data) {
          setMediationProcessEnabled(processResult.data.value?.enabled ?? false)
        } else {
          setMediationProcessEnabled(true)
        }
        setIsLoading(false)
      }
    }
    
    load()
    
    return () => {
      cancelled = true
    }
  }, [supabase])

  const toggleMediations = useCallback(async (enabled: boolean) => {
    const { error } = await supabase
      .from('settings')
      .update({ 
        value: { enabled }, 
        updated_at: new Date().toISOString() 
      })
      .eq('key', 'mediations_enabled')
    
    if (!error) {
      setMediationsEnabled(enabled)
    }
    return !error
  }, [supabase])

  const toggleMediationProcess = useCallback(async (enabled: boolean) => {
    const { error } = await supabase
      .from('settings')
      .update({ 
        value: { enabled }, 
        updated_at: new Date().toISOString() 
      })
      .eq('key', 'mediation_process_enabled')
    
    if (!error) {
      setMediationProcessEnabled(enabled)
    }
    return !error
  }, [supabase])

  return {
    mediationsEnabled,
    mediationProcessEnabled,
    isLoading,
    toggleMediations,
    toggleMediationProcess,
    refetch: async () => {
      setIsLoading(true)
      const [visibilityResult, processResult] = await Promise.all([
        supabase
          .from('settings')
          .select('value')
          .eq('key', 'mediations_enabled')
          .single(),
        supabase
          .from('settings')
          .select('value')
          .eq('key', 'mediation_process_enabled')
          .single()
      ])
      
      if (!visibilityResult.error && visibilityResult.data) {
        setMediationsEnabled(visibilityResult.data.value?.enabled ?? false)
      } else {
        setMediationsEnabled(false)
      }
      
      if (!processResult.error && processResult.data) {
        setMediationProcessEnabled(processResult.data.value?.enabled ?? false)
      } else {
        setMediationProcessEnabled(true)
      }
      setIsLoading(false)
    },
  }
}
