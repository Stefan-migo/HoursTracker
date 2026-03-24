'use client'

import { useMemo, useCallback } from 'react'
import { messageEngine } from '@/lib/messages/engine'
import '@/lib/messages/clock-in-templates'
import type { WorkState, MessageContext, MessageSet } from '@/lib/messages/types'
import {
  getTimeOfDay,
  getDayOfWeek,
} from '@/lib/utils/time-context'

interface UseMessageContextOptions {
  state: WorkState
  clockIn: string | null
  clockOut: string | null
  totalHours: number | null
  elapsedTime?: string
  userName?: string | null
  isEditMode?: boolean
}

interface UseMessageContextReturn {
  // Mensajes individuales
  title: string
  subtitle: string
  buttonText: string
  encouragement?: string

  // Set completo
  messages: MessageSet

  // Función para regenerar mensajes (útil para variaciones)
  refreshMessages: () => void
}

export function useMessageContext({
  state,
  clockIn,
  clockOut,
  totalHours,
  elapsedTime = '00:00:00',
  userName,
  isEditMode = false,
}: UseMessageContextOptions): UseMessageContextReturn {
  const now = new Date()
  const timeOfDay = getTimeOfDay(now)
  const dayOfWeek = getDayOfWeek(now)
  const currentHour = now.getHours()

  // Crear el contexto para el motor de mensajes
  const context: MessageContext = useMemo(
    () => ({
      state,
      clockIn,
      clockOut,
      totalHours,
      elapsedTime,
      userName,
      timeOfDay,
      dayOfWeek,
      isEditMode,
      currentHour,
    }),
    [
      state,
      clockIn,
      clockOut,
      totalHours,
      elapsedTime,
      userName,
      timeOfDay,
      dayOfWeek,
      isEditMode,
      currentHour,
    ]
  )

  // Generar mensajes memoizados
  const messages = useMemo(() => {
    // Generar título según el estado
    const title = messageEngine.generate(context)

    // Generar subtítulo específico
    const subtitleContext = { ...context }
    const subtitle = messageEngine.generate(subtitleContext)

    // Generar texto de botón
    const buttonText = messageEngine.generate(context)

    return {
      title,
      subtitle,
      buttonText,
    }
  }, [context])

  // Función para refrescar mensajes (generar nuevas variaciones)
  const refreshMessages = useCallback(() => {
    // Al cambiar alguna dependencia del contexto se regenerarán automáticamente
    // Esta función es un placeholder para futuras implementaciones
    // donde podríamos querer forzar una variación diferente
  }, [])

  return {
    title: messages.title,
    subtitle: messages.subtitle,
    buttonText: messages.buttonText,
    messages: {
      title: messages.title,
      subtitle: messages.subtitle,
      button: messages.buttonText,
    },
    refreshMessages,
  }
}

export default useMessageContext
