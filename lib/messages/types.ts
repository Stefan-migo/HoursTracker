// Tipos para el sistema de mensajes contextuales

export type WorkState = 'pending' | 'working' | 'completed'
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export interface MessageContext {
  state: WorkState
  clockIn: string | null
  clockOut: string | null
  totalHours: number | null
  elapsedTime: string
  userName?: string | null
  timeOfDay: TimeOfDay
  dayOfWeek: string
  isEditMode: boolean
  currentHour: number
}

export interface MessageTemplate {
  id: string
  condition: (context: MessageContext) => boolean
  priority: number
  variants: string[]
}

export interface MessageEngine {
  register: (template: MessageTemplate) => void
  generate: (context: MessageContext) => string
}

export type MessageCategory = 
  | 'pending'
  | 'working'
  | 'completed'
  | 'title'
  | 'subtitle'
  | 'button'
  | 'encouragement'

export interface MessageSet {
  title: string
  subtitle: string
  button: string
  encouragement?: string
}
